import os
import tempfile
import cv2
import numpy as np
import mediapipe as mp


def pose_from_landmarks(points, width, height):
    indexes = [1, 152, 33, 263, 61, 291]
    image_points = np.array([(points[i].x * width, points[i].y * height) for i in indexes], dtype=np.float64)
    model_points = np.array([(0, 0, 0), (0, -330, -65), (-225, 170, -135), (225, 170, -135), (-150, -150, -125), (150, -150, -125)], dtype=np.float64)
    camera = np.array([[width, 0, width / 2], [0, width, height / 2], [0, 0, 1]], dtype=np.float64)
    success, rotation, _ = cv2.solvePnP(model_points, image_points, camera, np.zeros((4, 1)), flags=cv2.SOLVEPNP_ITERATIVE)
    if not success:
        return None
    matrix, _ = cv2.Rodrigues(rotation)
    _, yaw, _ = cv2.RQDecomp3x3(matrix)[0]
    return float(yaw)


def validate_video(data, reference, poses):
    from deepface import DeepFace
    model_path = os.environ.get('FACE_LANDMARKER_MODEL', '/service/models/face_landmarker.task')
    if not os.path.isfile(model_path):
        return {'status': 'UNAVAILABLE', 'code': 'LANDMARK_MODEL_NOT_READY'}
    if poses not in [['STRAIGHT', 'LEFT', 'RIGHT', 'STRAIGHT'], ['STRAIGHT', 'RIGHT', 'LEFT', 'STRAIGHT']]:
        return {'status': 'REVIEW', 'code': 'INVALID_CHALLENGE'}
    path = None
    capture = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as target:
            target.write(data)
            path = target.name
        capture = cv2.VideoCapture(path)
        fps = capture.get(cv2.CAP_PROP_FPS)
        count = capture.get(cv2.CAP_PROP_FRAME_COUNT)
        if not capture.isOpened() or not 5 <= fps <= 60 or (count > 0 and count / fps > 24):
            return {'status': 'REVIEW', 'code': 'VIDEO_DURATION_OR_FORMAT'}
        options = mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=model_path), running_mode=mp.tasks.vision.RunningMode.VIDEO, num_faces=2, min_face_detection_confidence=0.7, min_face_presence_confidence=0.7, min_tracking_confidence=0.7)
        observations = []
        representatives = []
        step = max(1, int(fps / 4))
        with mp.tasks.vision.FaceLandmarker.create_from_options(options) as detector:
            decoded = 0
            for index in range(1440):
                ok, frame = capture.read()
                if not ok:
                    break
                decoded += 1
                if capture.get(cv2.CAP_PROP_POS_MSEC) > 24_000:
                    return {'status': 'REVIEW', 'code': 'VIDEO_DURATION_OR_FORMAT'}
                if index % step:
                    continue
                if frame.shape[0] > 1280 or frame.shape[1] > 1280:
                    return {'status': 'REVIEW', 'code': 'VIDEO_DIMENSIONS'}
                detected = detector.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)), int(index * 1000 / fps))
                if len(detected.face_landmarks) != 1:
                    observations.append(None)
                    continue
                yaw = pose_from_landmarks(detected.face_landmarks[0], frame.shape[1], frame.shape[0])
                observations.append(yaw)
                representatives.append((yaw, frame.copy()))
        if not 5 <= decoded / fps <= 24 or decoded >= 1440:
            return {'status': 'REVIEW', 'code': 'VIDEO_DURATION_OR_FORMAT'}
        if len(observations) < 20 or sum(x is None for x in observations) > len(observations) * 0.15:
            return {'status': 'REVIEW', 'code': 'KEEP_ONE_FACE_VISIBLE'}
        # Require sustained poses in the server-issued order; client timestamps are not trusted.
        stage = 0
        held = 0
        sampled = []
        for yaw, frame in representatives:
            pose = 'STRAIGHT' if abs(yaw) <= 12 else 'LEFT' if yaw < -20 else 'RIGHT' if yaw > 20 else None
            if stage < len(poses) and pose == poses[stage]:
                held += 1
                if held >= 3:
                    sampled.append(frame)
                    stage += 1
                    held = 0
            else:
                held = 0
        if stage != len(poses):
            return {'status': 'REVIEW', 'code': 'FOLLOW_HEAD_TURN_SEQUENCE', 'completedSteps': stage}
        for frame in sampled:
            faces = DeepFace.extract_faces(frame, detector_backend='opencv', enforce_detection=True, anti_spoofing=True)
            if len(faces) != 1 or faces[0].get('is_real') is not True or float(faces[0].get('antispoof_score', 0)) < 0.8:
                return {'status': 'REVIEW', 'code': 'PRESENTATION_ATTACK_OR_UNCERTAIN'}
            match = DeepFace.verify(reference, frame, model_name='SFace', detector_backend='opencv', distance_metric='cosine', enforce_detection=True)
            if not match['verified']:
                return {'status': 'REVIEW', 'code': 'VIDEO_FACE_MISMATCH'}
        return {'status': 'PASSED', 'engine': 'MediaPipe/DeepFace MiniFASNet/SFace', 'completedSteps': stage, 'framesChecked': len(sampled), 'certified': False}
    except Exception:
        return {'status': 'UNAVAILABLE', 'code': 'LIVE_ENGINE_NOT_READY'}
    finally:
        if capture is not None:
            capture.release()
        if path:
            os.unlink(path)

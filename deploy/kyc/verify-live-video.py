import json
import os
import tempfile
import cv2
import numpy as np
from live_video import validate_video
frames = np.full((480, 640, 3), 255, dtype=np.uint8)
reference = frames.copy()
descriptor, path = tempfile.mkstemp(suffix='.webm')
os.close(descriptor)
writer = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*'VP80'), 24, (640, 480))
assert writer.isOpened()
for _ in range(336):
    writer.write(frames)
writer.release()
try:
    result = validate_video(open(path,'rb').read(), reference, ['STRAIGHT','LEFT','RIGHT','STRAIGHT'])
    assert result['status'] == 'REVIEW', result
    assert result['code'] == 'KEEP_ONE_FACE_VISIBLE', result
    print(json.dumps({'blankVideoRejected':True,'code':result['code']}))
finally:
    os.unlink(path)

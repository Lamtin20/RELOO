"""Local, front-only identity extraction. QR/claimed identity never enters OCR."""
import re
import unicodedata


def fold(value):
    value = value.replace('Đ', 'D').replace('đ', 'd')
    return ''.join(c for c in unicodedata.normalize('NFD', value) if not unicodedata.combining(c)).upper()


def extract_rows(rows):
    text = '\n'.join(row['text'] for row in rows)
    normalized = ' '.join(re.sub(r'[^A-Z0-9\s]', ' ', fold(text)).split())
    kind = 'CCCD' if re.search(r'CAN\s*CUOC\s*CONG\s*DAN|CITIZEN\s*IDENTITY\s*CARD', normalized) else 'CAN_CUOC' if re.search(r'PERSONAL\s*IDENTIFICATION|SO\s*DINH\s*DANH\s*CA\s*NHAN', normalized) else 'UNKNOWN'
    numbers = []
    for row in rows:
        for run in re.findall(r'\d[\d \t]*\d', row['text']):
            number = re.sub(r'\s', '', run)
            if len(number) != 12:
                continue
            numbers.append((number, max((word['confidence'] for word in row.get('words', []) if number in word['text']), default=row['confidence'])))
    unique = list(dict.fromkeys(value for value, _ in numbers))
    number = unique[0] if len(unique) == 1 else None
    confidence = max((score for value, score in numbers if value == number), default=0)
    names = []
    for label in rows:
        if not re.search(r'FULL\s*NAME|HO\s*(?:VA\s*)?TEN|HO[,\s]+CHU\s+DEM', fold(label['text'])):
            continue
        for row in rows:
            if row is label or not 0 <= row['top'] - (label['top'] + label['height']) <= label['pageHeight'] * .13:
                continue
            if abs(row['left'] - label['left']) > label['pageWidth'] * .20:
                continue
            candidate = re.sub(r'^\W+|\W+$', '', row['text'].strip())
            canonical = fold(candidate)
            if re.search(r'\d|NGAY|GIOI TINH|QUOC TICH|DATE OF|NATIONALITY|SEX|RESIDENCE|FULL NAME', canonical):
                continue
            if len(candidate.split()) >= 2 and len(candidate) <= 100 and candidate.upper() == candidate and re.fullmatch(r"[A-Z '\-]+", canonical):
                names.append((row['top'], candidate, row['confidence']))
    names.sort()
    return {'cardType': kind, 'nationalId': number, 'fullName': names[0][1] if names else None,
            'idConfidence': confidence, 'nameConfidence': names[0][2] if names else 0}


def expiry_from_rows(rows):
    for label in rows:
        if not re.search(r'HET HAN|GIA TRI DEN|DATE OF EXPIRY', fold(label['text'])):
            continue
        nearby = [label] + [row for row in rows if -label['pageHeight']*.03 <= row['top'] - (label['top'] + label['height']) <= label['pageHeight'] * .10 and row['top']>label['top'] and abs(row['left'] - label['left']) < label['pageWidth'] * .25]
        for row in nearby:
            match = re.search(r'(?<!\d)(\d{2})[/.-](\d{2})[/.-](\d{4})(?!\d)', row['text'])
            if match:
                from datetime import date
                try:
                    return date(int(match[3]), int(match[2]), int(match[1])).isoformat()
                except ValueError:
                    pass
    return None


def birth_from_rows(rows):
    # Restrict dates to the DOB label/next line; never guess from other card dates.
    from datetime import date
    for label in rows:
        if not re.search(r'NGAY\s+SINH|DATE\s+OF\s+BIRTH', fold(label['text'])):
            continue
        nearby = [label] + [r for r in rows if 0 <= r['top'] - (label['top'] + label['height']) <= label['pageHeight'] * .08 and abs(r['left'] - label['left']) <= label['pageWidth'] * .2]
        for row in nearby:
            match = re.search(r'(?<!\d)(\d{2})[/.-](\d{2})[/.-](\d{4})(?!\d)', row['text'])
            if match:
                try:
                    return date(int(match[3]), int(match[2]), int(match[1])).isoformat()
                except ValueError:
                    pass
    return None


def crop_card(picture):
    import cv2
    import numpy as np
    from PIL import Image
    rgb = np.array(picture)
    ratio = min(1, 1100 / max(picture.size))
    small = cv2.resize(rgb, None, fx=ratio, fy=ratio)
    edges = cv2.Canny(cv2.GaussianBlur(cv2.cvtColor(small, cv2.COLOR_RGB2GRAY), (5, 5), 0), 35, 130)
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    hsv = cv2.cvtColor(small, cv2.COLOR_RGB2HSV)
    color = cv2.inRange(hsv, np.array([35, 25, 35]), np.array([150, 255, 255]))
    color = cv2.morphologyEx(color, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    colored, _ = cv2.findContours(color, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = sorted(colored, key=cv2.contourArea, reverse=True)[:3]
    candidates += sorted(contours, key=cv2.contourArea, reverse=True)[:40]
    for contour in candidates:
        if cv2.contourArea(contour) < small.shape[0] * small.shape[1] * .18:
            continue
        polygon = cv2.boxPoints(cv2.minAreaRect(contour)).reshape(4, 1, 2) if any(contour is c for c in colored) else cv2.approxPolyDP(contour, cv2.arcLength(contour, True) * .025, True)
        if len(polygon) != 4 or not cv2.isContourConvex(polygon):
            continue
        points = polygon.reshape(4, 2).astype('float32') / ratio
        total, diff = points.sum(axis=1), np.diff(points, axis=1).reshape(-1)
        ordered = np.array([points[total.argmin()], points[diff.argmin()], points[total.argmax()], points[diff.argmax()]], dtype='float32')
        width = int(max(np.linalg.norm(ordered[1]-ordered[0]), np.linalg.norm(ordered[2]-ordered[3])))
        height = int(max(np.linalg.norm(ordered[3]-ordered[0]), np.linalg.norm(ordered[2]-ordered[1])))
        if not 1.3 < max(width, height) / max(1, min(width, height)) < 1.95:
            continue
        matrix = cv2.getPerspectiveTransform(ordered, np.array([[0, 0], [width-1, 0], [width-1, height-1], [0, height-1]], dtype='float32'))
        return Image.fromarray(cv2.warpPerspective(rgb, matrix, (width, height)))
    return picture


def recognize(picture, rotation, psm=6, right=False):
    import cv2
    import numpy as np
    import pytesseract
    from PIL import ImageOps
    image = picture.rotate(rotation, expand=True)
    if right and image.width > image.height:
        image = image.crop((round(image.width * .28), 0, image.width, image.height))
    image.thumbnail((2600, 2600))
    gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
    gray = cv2.bilateralFilter(gray, 5, 35, 35)
    foreground = cv2.threshold(gray, 125, 255, cv2.THRESH_BINARY_INV)[1]
    foreground = cv2.morphologyEx(foreground, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    from PIL import Image
    image = Image.fromarray(255 - foreground)
    data = pytesseract.image_to_data(image, lang='vie+eng', config=f'--psm {psm}', output_type=pytesseract.Output.DICT)
    lines = {}
    for i, value in enumerate(data['text']):
        value = value.strip()
        confidence = float(data['conf'][i])
        if not value or confidence < 0:
            continue
        key = (data['block_num'][i], data['par_num'][i], data['line_num'][i])
        lines.setdefault(key, []).append((i, value, confidence))
    rows = []
    for words in lines.values():
        left = min(data['left'][i] for i, _, _ in words)
        top = min(data['top'][i] for i, _, _ in words)
        bottom = max(data['top'][i]+data['height'][i] for i, _, _ in words)
        rows.append({'text': ' '.join(value for _, value, _ in words), 'words': [{'text': value, 'confidence': score, 'left': data['left'][i], 'top': data['top'][i], 'width': data['width'][i], 'height': data['height'][i]} for i, value, score in words], 'confidence': min((score for _, value, score in words if re.search(r'[\w]', value)), default=0), 'left': left, 'top': top, 'height': bottom-top, 'pageWidth': image.width, 'pageHeight': image.height})
    return sorted(rows, key=lambda row: (row['top'], row['left']))


def refine_fields(picture, rotation, rows, fields):
    import pytesseract
    from PIL import ImageOps
    image = picture.rotate(rotation, expand=True)
    if image.width > image.height:
        image = image.crop((round(image.width * .28), 0, image.width, image.height))
    image.thumbnail((2600, 2600))
    for key, confidence_key in [('nationalId', 'idConfidence'), ('fullName', 'nameConfidence')]:
        value = fields.get(key)
        if not value:
            continue
        selected = []
        for row in rows:
            if key == 'nationalId' and value not in re.sub(r'\s', '', row['text']):
                continue
            if key == 'fullName' and value not in row['text']:
                continue
            for word in row.get('words', []):
                text = word['text']
                if key == 'nationalId' and re.search(r'\d', text) or key == 'fullName' and any(c.isalpha() for c in text) and text.upper() == text and len(text) > 1:
                    selected.append(word)
        if not selected:
            continue
        left, top = min(w['left'] for w in selected), min(w['top'] for w in selected)
        right, bottom = max(w['left']+w['width'] for w in selected), max(w['top']+w['height'] for w in selected)
        padding = max(8, round((bottom-top)*.18))
        crop = ImageOps.autocontrast(ImageOps.grayscale(image.crop((max(0,left-padding), max(0,top-padding), min(image.width,right+padding), min(image.height,bottom+padding)))))
        config = '--psm 7' + (' -c tessedit_char_whitelist=0123456789' if key == 'nationalId' else '')
        data = pytesseract.image_to_data(crop, lang='eng' if key == 'nationalId' else 'vie+eng', config=config, output_type=pytesseract.Output.DICT)
        words = [(text.strip(), float(data['conf'][i])) for i,text in enumerate(data['text']) if text.strip() and float(data['conf'][i]) >= 0]
        candidate = ''.join(text for text,_ in words) if key == 'nationalId' else ' '.join(text for text,_ in words).strip()
        if not words or key == 'nationalId' and not re.fullmatch(r'\d{12}', candidate):
            continue
        if key == 'fullName' and (len(candidate.split()) < 2 or re.search(r'\d', candidate)):
            continue
        fields[key], fields[confidence_key] = candidate, min(score for _,score in words)
    return fields


def legacy_expiry(footer, rows):
    import pytesseract
    from PIL import ImageOps
    from datetime import date
    if not any('EXPIR' in fold(row['text']) or 'GIA TRI' in fold(row['text']) for row in rows):
        return None
    for row in rows:
        for word in row.get('words',[]):
            if not re.search(r'\d{4}',word['text']):
                continue
            left,top=word['left'],word['top']
            crop=footer.crop((max(0,left-10),max(0,top-8),min(footer.width,left+word['width']+10),min(footer.height,top+word['height']+8)))
            crop=ImageOps.autocontrast(ImageOps.grayscale(crop)).resize((crop.width*3,crop.height*3))
            text=pytesseract.image_to_string(crop,lang='eng',config='--psm 7 -c tessedit_char_whitelist=0123456789/.-').strip()
            if re.fullmatch(r'\d{8}',text):
                text=text[:2]+'/'+text[2:4]+'/'+text[4:]
            match=re.fullmatch(r'(\d{2})[/.-](\d{2})[/.-](\d{4})',text)
            if match:
                try:
                    return date(int(match[3]),int(match[2]),int(match[1])).isoformat()
                except ValueError:
                    pass
    return None


def read_card_pair(front, back):
    front = crop_card(front)
    best, best_score, front_rows, best_rotation = None, -1, [], 0
    for rotation in ([0,180] if front.width > front.height else [90,270]):
        candidates = []
        for psm in [11,6]:
            rows = recognize(front, rotation, psm, right=True)
            candidate = refine_fields(front, rotation, rows, extract_rows(rows))
            candidates.append((candidate,rows))
        kinds = {candidate['cardType'] for candidate,_ in candidates if candidate['cardType'] != 'UNKNOWN'}
        for candidate,rows in candidates:
            if candidate['cardType'] == 'UNKNOWN' and len(kinds) == 1:
                candidate['cardType'] = next(iter(kinds))
            name = lambda value: re.sub(r'[^A-Z\s]', '', fold(value or '')).split()
            candidate['consistentReads'] = sum(1 for other,_ in candidates if candidate['nationalId'] and candidate['fullName'] and other['nationalId']==candidate['nationalId'] and name(other['fullName'])==name(candidate['fullName']))
            score = (candidate['cardType'] != 'UNKNOWN') * 3 + bool(candidate['nationalId']) * 3 + bool(candidate['fullName']) * 3 + (candidate['idConfidence']+candidate['nameConfidence'])/200
            if score > best_score:
                best, best_score, front_rows, best_rotation = candidate, score, rows, rotation
        if best_score >= 9.85 or best_score >= 9.5 and best.get('consistentReads',0) >= 2:
            break
    expiry = expiry_from_rows(front_rows) if best['cardType'] == 'CCCD' else None
    if not expiry and best['cardType'] == 'CCCD':
        expiry = expiry_from_rows(recognize(front,best_rotation,11))
        if not expiry:
            oriented = front.rotate(best_rotation,expand=True)
            footer = oriented.crop((0,round(oriented.height*.68),round(oriented.width*.50),oriented.height))
            for psm in [6,11]:
                rows = recognize(footer,0,psm)
                expiry = expiry_from_rows(rows) or legacy_expiry(footer,rows)
                if not expiry:
                    from vietocr_engine import recognize_rows
                    enhanced, _ = recognize_rows(footer,0,rows,right=False)
                    expiry = expiry_from_rows(enhanced)
                if expiry:
                    break
    expiry_side = 'front' if expiry else None
    if not expiry and best['cardType'] == 'CAN_CUOC':
        back = crop_card(back)
        for rotation in ([0,180] if back.width > back.height else [90,270]):
            expiry = expiry_from_rows(recognize(back, rotation,11))
            if expiry:
                expiry_side = 'back'
                break
    best['dateOfBirth'] = birth_from_rows(front_rows)
    result = {'version': 'VN_CARD_OCR_V1', 'front': best, 'expiryDate': expiry, 'expirySide': expiry_side}
    from vietocr_engine import recognize_rows, status
    if status() != 'DISABLED':
        rows, state = recognize_rows(front, best_rotation, front_rows)
        result['vietocr'] = {'status': state, 'front': {**extract_rows(rows), 'dateOfBirth': birth_from_rows(rows)}, 'scoresCalibrated': False}
    return result

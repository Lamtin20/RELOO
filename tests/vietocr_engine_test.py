import sys
from pathlib import Path
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'deploy' / 'kyc'))
from document_ocr import extract_rows, birth_from_rows, expiry_from_rows
import vietocr_engine as engine


def row(text, top=10):
    return {'text': text, 'left': 10, 'top': top, 'height': 15, 'pageWidth': 600, 'pageHeight': 400, 'confidence': 90, 'words': [{'left': 10, 'top': top, 'width': 300, 'height': 15, 'text': text, 'confidence': 90}]}


class VietOcrTests(unittest.TestCase):
    def test_ambiguous_number_is_not_resolved_to_an_expected_identity(self):
        self.assertIsNone(extract_rows([row('099000000001 099000000002')])['nationalId'])
        self.assertEqual(extract_rows([row('099000000001')])['nationalId'], '099000000001')

    def test_dates_require_correct_label_and_calendar(self):
        self.assertEqual(birth_from_rows([row('Ngày sinh / Date of birth: 01/01/1990')]), '1990-01-01')
        self.assertIsNone(birth_from_rows([row('Ngày sinh 31/02/1990')]))
        self.assertIsNone(birth_from_rows([row('Ngày hết hạn 01/01/2040')]))

    def test_two_printed_expiry_labels_and_adjacent_old_card_date(self):
        self.assertEqual(expiry_from_rows([row('Ngày, tháng, năm hết hạn / Date of expiry: 05/08/2039')]), '2039-08-05')
        self.assertEqual(expiry_from_rows([row('Có giá trị đến06/09/2028')]), '2028-09-06')
        self.assertIsNone(expiry_from_rows([row('Ngày cấp: 05/08/2039')]))

    def test_disabled_does_not_import_or_download_a_model(self):
        with patch.dict('os.environ', {}, clear=True):
            self.assertIsNone(engine.load_reader())
            self.assertEqual(engine.status(), 'DISABLED')

    def test_missing_weights_is_unavailable_not_success(self):
        with patch.dict('os.environ', {'RELOO_VIETOCR_ENABLED': '1'}, clear=True):
            with patch.object(engine, '_reader', None), patch.object(engine, '_failed', False):
                self.assertIsNone(engine.load_reader())
                self.assertEqual(engine.status(), 'UNAVAILABLE')

    def test_regions_are_bounded_and_invalid_predictions_rejected(self):
        from PIL import Image
        picture = Image.new('RGB', (600, 400))
        calls = []
        def predict(crop):
            calls.append(crop.size)
            return 'NGUYỄN VĂN THỬ', .9
        # Landscape crop has width432 after excluding the portrait column.
        rows, state = engine.recognize_rows(picture, 0, [row('text')] * 40, reader=predict)
        self.assertEqual(len(calls), 16)
        self.assertEqual(state, 'PROCESSED')
        self.assertEqual(rows[0]['text'], 'NGUYỄN VĂN THỬ')
        invalid = row('text');invalid['left'] = -100
        self.assertEqual(engine.recognize_rows(picture, 0, [invalid], reader=predict)[0], [])
        self.assertEqual(engine.recognize_rows(picture, 0, [row('text')], reader=lambda crop: ('private\ntext', .9))[0], [])


if __name__ == '__main__':
    unittest.main()

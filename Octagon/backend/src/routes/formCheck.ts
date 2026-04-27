import { Router } from 'express';
import multer from 'multer';
import { analyzeForm, getFormHistory } from '../controllers/formCheckController';
import { protect } from '../middleware';

const router = Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 200 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (!file.mimetype.startsWith('video/')) {
			cb(new Error('Only video uploads are supported'));
			return;
		}
		cb(null, true);
	},
});

// POST /api/form-check - Analyze form
router.post('/', protect, upload.single('video'), analyzeForm);

// GET /api/form-check/history - Get form check history
router.get('/history', protect, getFormHistory);

export default router;

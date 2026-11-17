import { Router } from 'express';

import {
  GetMailConfigHandler,
  SaveMailConfigHandler,
  SendAlertHandler,
  TestMailHandler,
} from '@/napcat-webui-backend/src/api/Mail';

const router: Router = Router();

router.get('/GetConfig', GetMailConfigHandler);
router.post('/SaveConfig', SaveMailConfigHandler);
router.post('/Test', TestMailHandler);
router.post('/SendAlert', SendAlertHandler);

export { router as MailRouter };

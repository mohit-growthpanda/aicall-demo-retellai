import { Router } from "express";
import { handleRetellWebhook } from "../controller/aiCallingWebhook.controller";

const router = Router();

router.post("/retell/ai-wbh", handleRetellWebhook);

export default router;

import { Router } from "express";
import { triggerDemoCall } from "../controller/demo.controller";

const router = Router();

router.post("/trigger-call", triggerDemoCall);

export default router;

import { Router } from "express";
import { triggerDemoCall } from "../controller/demo.controller";

const router: Router = Router();

router.post("/trigger-call", triggerDemoCall);

export default router;

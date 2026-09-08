import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hookStepsRouter from "./hook-steps";
import youtubeRouter from "./youtube";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hookStepsRouter);
router.use(youtubeRouter);

export default router;

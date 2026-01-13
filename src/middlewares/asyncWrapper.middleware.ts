import { NextFunction, Request, Response } from "express";

type AsyncFunction = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void>;

export default (fn: AsyncFunction) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

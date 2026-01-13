import { Response } from "express";

interface SuccessResponse {
    message: string;
    data?: unknown;
    meta?: unknown;
}

interface ErrorResponse {
    message: string;
    statusCode: number;
    errors?: unknown;
}

export const successResponse = (
    res: Response,
    { message, data, meta }: SuccessResponse
) => {
    return res.status(200).json({
        success: true,
        message,
        data,
        meta,
    });
};

export const errorResponse = (
    res: Response,
    { message, statusCode, errors }: ErrorResponse
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors,
    });
};

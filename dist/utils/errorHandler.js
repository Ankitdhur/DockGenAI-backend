"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.createError = exports.errorHandler = void 0;
const errorHandler = (error, req, res, next) => {
    let { statusCode = 500, message } = error;
    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    }
    if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    }
    if (error.name === 'MongoError' && error.code === 11000) {
        statusCode = 400;
        message = 'Duplicate field value';
    }
    // Log error for debugging
    console.error('Error:', {
        message: error.message,
        stack: error.stack,
        statusCode,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            statusCode,
            timestamp: new Date().toISOString(),
            path: req.url
        }
    });
};
exports.errorHandler = errorHandler;
const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
exports.createError = createError;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map
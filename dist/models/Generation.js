"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Generation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const GenerationSchema = new mongoose_1.Schema({
    githubUrl: {
        type: String,
        required: true,
        trim: true
    },
    githubToken: {
        type: String,
        required: true,
        trim: true
    },
    techStack: [{
            type: String,
            trim: true
        }],
    dockerfile: {
        type: String,
        default: ''
    },
    buildStatus: {
        type: String,
        enum: ['pending', 'building', 'success', 'error'],
        default: 'pending'
    },
    imageId: {
        type: String,
        trim: true
    },
    error: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});
// Index for better query performance
GenerationSchema.index({ githubUrl: 1, createdAt: -1 });
exports.Generation = mongoose_1.default.model('Generation', GenerationSchema);
//# sourceMappingURL=Generation.js.map
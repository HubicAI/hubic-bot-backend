import mongoose from "mongoose";

// Define the nested spin schema
const SpinSchema = new mongoose.Schema({
    count: {
        type: Number,
        required: true,
        default: 1
    },
    unlockDuration: {
        type: Number,
        required: true,
        default: 3600 * 1000 * 2 // 2 hours
    },
    lastUpdateTime: {
        type: Number,
        required: true,
        default: Date.now() // correct way
    }
}, { _id: false }); // No need for a separate _id for nested schema

// Define the main user schema
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    chatId: {
        type: String,
        required: true,
    },
    friend: {
        type: String,
        required: false,
    },
    points: {
        type: Number,
        default: 0,
    },
    otp: {
        type: String,
        required: false,
    },
    spin: {
        type: SpinSchema,
        default: () => ({}) // ensure default values are applied
    }
});

// Create the model
export const User = mongoose.model("users", UserSchema);

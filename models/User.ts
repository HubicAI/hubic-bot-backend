import mongoose from "mongoose";

// Define quests
const Quest = new mongoose.Schema({
    completed: {
        type: Boolean,
        default: false
    },
    daily: {
        type: Boolean,
        default: false
    },
    completedDay: {
        type: Number,
        required: true,
        default: Date.now()
    }
}, { _id: false })

const Quests = new mongoose.Schema({
    joinTelegramQuest: {
        type: Quest,
        default: () => ({})
    },
    activeTelegramQuest: {
        type: Quest,
        default: {
            completed: false,
            daily: true,
            completedDay: Date.now()
        }
    },
    followXQuest: {
        type: Quest,
        default: () => ({})
    },
    referFriendQuest: {
        type: Quest,
        default: () => ({})
    },
    postXQuest: {
        type: Quest,
        default: {
            completed: false,
            daily: true,
            completedDay: Date.now()
        }
    }
}, { _id: false })

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
    },
    quests: {
        type: Quests,
        default: () => ({})
    }
});

// Create the model
export const User = mongoose.model("users", UserSchema);

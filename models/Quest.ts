// Quest Model
import mongoose from "mongoose";

const QuestSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    link: {
        type: String,
        required: false,
    },
    points: {
        type: Number,
        required: true,
    },
    isOt: {
        type: Boolean,
        required: true,
    },
    who_done: [{
        user: { type: mongoose.Schema.Types.ObjectId },
        timestamp: { type: Date, default: Date.now }
    }],
});

export const Quest = mongoose.model("quests", QuestSchema);

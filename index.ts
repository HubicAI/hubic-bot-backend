import express, { Request, Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import rs from "randomstring";

// Load Models
import { User } from "./models/User";
import { Quest } from "./models/Quest";

// Telegram Module
import { Bot, InlineKeyboard, Context, webhookCallback } from "grammy";

// import util
import { calculateModParts } from './util'

// ** import helper
import { getRandomPrize } from "./helper/spin";

// ** import constants
import { prizes, max_time_difference } from "./config";

dotenv.config();

const app = express();
const port = process.env.PORT || 7001;
const telegram_bot_token = process.env.BOT_TOKEN as string;
const admin_pwd = process.env.ADMIN_PASSWORD;

const bot = new Bot(telegram_bot_token);

const gen = () => rs.generate(8);

app.use(cors());
app.use(express.json());
// app.use("/telegram-webhook", webhookCallback(bot, "express"))

mongoose
    .connect(process.env.MONGODB_URI as string)
    .then(() => console.log("MongoDB is connected"))
    .catch((err) => console.log(err));

app.get("/", (req: Request, res: Response) => {
    res.send("Hello world!");
});

// Get User By Id
app.post("/get-user", async (req: any, res: any) => {
    const username = req.body.userid;

    if (!username) return res.status(400).json({ msg: "Bad request" });

    try {
        const user = await User.findOne({ username });

        return res.status(200).json(user);
    } catch (error) {
        console.error("Get an user error: ", error);
        return res.status(500).json({ msg: "Internal server error" });
    }
});

// Get User's spin
app.post("/get-user-spin", async (req: any, res: any) => {
    const username = req.body.userid;

    if (!username) return res.status(400).json({ msg: "Bad request" });

    try {
        const user = await User.findOne({ username })

        if (!user) {
            return res.status(404).json({ msg: "No user found" });
        }

        const passedTime = Date.now() - user.spin.lastUpdateTime
        if (passedTime >= user.spin.unlockDuration) {
            const { quotient, remainder } = calculateModParts(passedTime, user.spin.unlockDuration)
            user.spin.count += quotient;
            user.spin.lastUpdateTime = Date.now() - remainder

            await user.save()
        }

        return res.status(200).json(user.spin)
    }
    catch (error) {
        console.error("Get an user error: ", error);
        return res.status(500).json({ msg: "Internal server error" });
    }
});

// Spin operation
app.post("/spin", async (req: any, res: any) => {
    const username = req.body.userid;

    if (!username) return res.status(400).json({ msg: "Bad request" });

    try {
        const user = await User.findOne({ username })

        if (!user) {
            return res.status(404).json({ msg: "No user found" });
        }

        if (user.spin.count <= 0) {
            return res.status(500).json({ msg: "Insufficient spin" });
        }

        const prize = getRandomPrize(prizes)
        user.points += prize.amount;
        user.spin.count -= 1;

        await user.save()

        return res.status(200).json(prize)
    }
    catch (error) {
        console.error("Get an user error: ", error);
        return res.status(500).json({ msg: "Internal server error" });
    }
});

// Get Users By Ranks
app.get("/get-users", async (req: any, res: any) => {
    try {
        const users = await User.find().sort({ points: -1 }).limit(100).exec();

        return res.status(200).json(users);
    } catch (error) {
        console.error("Fetching all the users error: ", error);
        return res.status(500).json({ msg: "Internal server error" });
    }
});

// Get Quests
app.post("/get-quests", async (req: any, res: any) => {
    try {
        const username = req.body.userid;
        const usertimestamp = req.body.usertime;

        if (!username) return res.status(400).json({ msg: "Bad request: No username" });
        if (!usertimestamp) return res.status(400).json({ msg: "Bad request: No user timestamp" });

        try {
            const user = await User.findOne({ username })

            if (!user) {
                return res.status(404).json({ msg: "No user found" });
            }

            const tgActiveQuest = user.quests.activeTelegramQuest;
            const xPostQuest = user.quests.postXQuest;

            const tgActiveQuestCompletedDay = new Date(tgActiveQuest.completedDay)
            const xPostQuestCompletedDay = new Date(xPostQuest.completedDay)

            const usertime = new Date(usertimestamp)
            const serverTime = new Date()

            const maxFutureTime = new Date(serverTime.getTime() + max_time_difference);

            if (usertime > maxFutureTime) {
                return res.status(400).json({ msg: "Invalid time: user time too far ahead" });
            }

            const tgActiveQuestTodayCompleted =
                usertime.getFullYear() === tgActiveQuestCompletedDay.getFullYear() &&
                usertime.getMonth() === tgActiveQuestCompletedDay.getMonth() &&
                usertime.getDate() === tgActiveQuestCompletedDay.getDate();

            const xPostQuestTodayCompleted =
                usertime.getFullYear() === xPostQuestCompletedDay.getFullYear() &&
                usertime.getMonth() === xPostQuestCompletedDay.getMonth() &&
                usertime.getDate() === xPostQuestCompletedDay.getDate();

            if(tgActiveQuest.completed && !tgActiveQuestTodayCompleted) {
                user.quests.activeTelegramQuest.completed = false;
                await user.save()
            }

            if(xPostQuest.completed && !xPostQuestTodayCompleted) {
                user.quests.postXQuest.completed = false;
                await user.save()
            }

            return res.status(200).json(user.quests)
        }
        catch (error) {
            return res.status(500).json({ msg: "Internal server error" });
        }
    } catch (error) {
        console.error("Fetching all the users error: ", error);
        return res.status(500).json({ msg: "Internal server error" });
    }
});

app.post("/join-telegram", async (req: any, res: any) => {
    const username = req.body.userid;
    if (!username) return res.status(400).json({ msg: "Bad request: No username" });

    try {
        const user = await User.findOne({ username })

        if (!user) {
            return res.status(404).json({ msg: "No user found" });
        }

        if(!user.quests.joinTelegramQuest.completed) {
            user.quests.joinTelegramQuest.completed = true
            user.points += 10000

            await user.save()
        }
    }
    catch(error) {
        return res.status(500).json({ msg: "Internal server error" });
    }
})

app.post("/follow-x", async (req: any, res: any) => {
    const username = req.body.userid;
    if (!username) return res.status(400).json({ msg: "Bad request: No username" });

    try {
        const user = await User.findOne({ username })

        if (!user) {
            return res.status(404).json({ msg: "No user found" });
        }

        if(!user.quests.followXQuest.completed) {
            user.quests.followXQuest.completed = true
            user.points += 10000

            await user.save()
        }
    }
    catch(error) {
        return res.status(500).json({ msg: "Internal server error" });
    }
})

app.post("/post-x", async (req: any, res: any) => {
    const username = req.body.userid;
    const usertimestamp = req.body.usertime;

    if (!username) return res.status(400).json({ msg: "Bad request: No username" });

    try {
        const user = await User.findOne({ username })

        if (!user) {
            return res.status(404).json({ msg: "No user found" });
        }

        if(!user.quests.postXQuest.completed) {
            user.quests.postXQuest.completed = true
            user.points += 10000

            user.quests.postXQuest.completedDay = usertimestamp

            await user.save()
        }
    }
    catch(error) {
        return res.status(500).json({ msg: "Internal server error" });
    }
})

app.post("/complete-quest", async (req: any, res: any) => {
    const username = req.body.userid;
    const questId = req.body.questId;

    if (!username || !questId)
        return res.status(400).json({ msg: "Bad request" });

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ msg: "User not found" });

        const quest = await Quest.findOne({ _id: questId });
        if (!quest) return res.status(404).json({ msg: "Quest not found" });

        // Check if quest is daily
        const isDaily = quest.title.toLowerCase().includes("daily");

        if (isDaily) {
            // Check if user has claimed today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const hasClaimedToday = quest.who_done.some(
                (claim) =>
                    claim.user?.toString() === user._id.toString() &&
                    new Date(claim.timestamp).setHours(0, 0, 0, 0) === today.getTime()
            );

            if (hasClaimedToday) {
                return res
                    .status(400)
                    .json({ msg: "You've already claimed this daily quest today" });
            }

            // Add new claim for today
            quest.who_done.push({
                user: user._id,
                timestamp: new Date(),
            });
        } else {
            // For non-daily quests, check if ever completed
            if (
                quest.who_done.some(
                    (item) => item.user?.toString() === user._id.toString()
                )
            ) {
                return res
                    .status(400)
                    .json({ msg: "You already completed this quest" });
            }

            quest.who_done.push({ user: user._id });
        }

        await quest.save();

        user.points += quest.points;
        await user.save();

        return res.status(200).json({ msg: "Quest is completed" });
    } catch (error) {
        console.error("Complete the quest error: ", error);
        return res.status(500).json({ msg: "Internal server error" });
    }
});

// Add a new endpoint to check quest status
app.post("/check-quest-status", async (req: any, res: any) => {
    const username = req.body.userid;
    const questId = req.body.questId;

    if (!username || !questId)
        return res.status(400).json({ msg: "Bad request" });

    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ msg: "User not found" });

        const quest = await Quest.findOne({ _id: questId });
        if (!quest) return res.status(404).json({ msg: "Quest not found" });

        const isDaily = quest.title.toLowerCase().includes("daily");

        if (isDaily) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const hasClaimedToday = quest.who_done.some(
                (claim) =>
                    claim.user?.toString() === user._id.toString() &&
                    new Date(claim.timestamp).setHours(0, 0, 0, 0) === today.getTime()
            );

            return res.status(200).json({
                canClaim: !hasClaimedToday,
                isDaily: true,
            });
        } else {
            const hasCompleted = quest.who_done.some(
                (item) => item.user?.toString() === user._id.toString()
            );

            return res.status(200).json({
                canClaim: !hasCompleted,
                isDaily: false,
            });
        }
    } catch (error) {
        console.error("Check quest status error: ", error);
        return res.status(500).json({ msg: "Internal server error" });
    }
});

app.post("/end-event", async (req: any, res: any) => {
    const password = req.body.password;
    if (password !== admin_pwd)
        return res
            .status(400)
            .json({ msg: "Bad request: your password is incorrect" });

    try {
        const users = await User.find().sort({ points: -1 }).limit(100).exec();
        if (!users) return res.status(404).json({ msg: "No users" });

        for (let i = 0; i < users.length; i++) {
            users[i].otp = gen();
            await users[i].save();
        }

        return res.status(200).json({ msg: "Success" });
    } catch (error) {
        console.error("End event error: ", error);
        return res.status(500).json({ msg: "Internal server error" });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Telegram Bot
bot.command("start", async (ctx: Context) => {
    try {
        const userid = ctx.from?.username || ctx.from?.id; // Get the Telegram user ID
        const chatId = ctx.from?.id;
        const receiveid = ctx.match;

        const user = await User.findOne({ username: userid });

        if (!user && receiveid && (receiveid != userid)) {
            // Register User
            const quest = await Quest.findOne({ type: "refer" });

            await User.create({
                username: userid,
                friend: receiveid,
                chatId,
            });

            const sender = await User.findOne({ username: receiveid });
            if (sender) {
                // Give 3 free spin
                sender.spin.count += 3;
                // Give 1000 points ro referrer
                sender.points += 20000;

                if(!sender.quests.referFriendQuest.completed) {
                    sender.quests.referFriendQuest.completed = true
                }

                await sender.save();

                await ctx.api.sendMessage(sender.chatId, `Congratulations! You received 3 free spins and 20000 points by refer new user @${ctx.from?.username}`)
            }
        }

        if (!user && !receiveid) {
            // Register User
            await User.create({
                username: userid,
                chatId
            });
        }

        const menus = new InlineKeyboard().webApp(
            "START",
            `https://hubic-mini-app.vercel.app/?user=${encodeURIComponent(userid as string)}`
        );

        await ctx.replyWithPhoto("https://ibb.co/YK1WwrK", {
            reply_markup: menus,
            parse_mode: "HTML",
            caption: `Hello, @${userid}! Welcome to Hubic AI bot. 👋\n\nMy mission is to assist you in your attempt to win a whitelist spot and become an Hubic Firestarter.\n\nTo start our Telegram app and register automatically, please click 'Start'.`,
        });
    } catch (error) {
        console.log(
            "Internal server error during starting the telegram bot",
            error
        );
    }
});

(async () => {
    await bot.api.deleteWebhook();
    await bot.start();
})();

// const broadcast = async (idx: number) => {
//   const users = await User.find();
//   if (users.length > 0) {
//     for (let i = idx; i < users.length; i++) {
//       console.log(i, users[i].username, users[i].chatId);

//       if (users[i].chatId) {
//         try {
//           await bot.api.sendMessage(
//             users[i].chatId,
//             "Hello, everyone,\n\n DÆTA LVRG v0.0.1 it's live; make sure you use your OTP code to register.\n\nFor more information please read our Medium article: https://daetastorage.medium.com/d%C3%A6ta-lvrg-plugin-github-version-0-0-1-now-available-for-firestarters-59324490b4c8"
//           );
//         } catch (error) {
//           broadcast(i + 1);
//           return;
//         }
//       }
//     }
//   }
// };

// (async () => {
//   broadcast(0);
// })();

"use strict";

const BoardModel = require("../models").Board;
const ThreadModel = require("../models").Thread;
const ReplyModel = require("../models").Reply;

module.exports = function (app) {
  app
    .route("/api/threads/:board")
    .post(async (req, res) => {
      const { text, delete_password } = req.body;
      let board = req.body.board;
      if (!board) {
        board = req.params.board;
      }
      console.log("post", req.body);
      const newThread = new ThreadModel({
        text: text,
        delete_password: delete_password,
        replies: [],
      });
      console.log("newThread", newThread);

      try {
        let Boarddata = await BoardModel.findOne({ name: board });
        if (!Boarddata) {
          const newBoard = new BoardModel({
            name: board,
            threads: [],
          });
          console.log("newBoard", newBoard);
          newBoard.threads.push(newThread);
          const data = await newBoard.save();
          console.log("newBoardData", data);
          res.json(newThread);
        } else {
          Boarddata.threads.push(newThread);
          const data = await Boarddata.save();
          res.json(newThread);
        }
      } catch (err) {
        console.log(err);
        res.send("There was an error saving in post");
      }
    })
    .get(async (req, res) => {
      const board = req.params.board;
      try {
        const data = await BoardModel.findOne({ name: board });
        if (!data) {
          console.log("No board with this name");
          res.json({ error: "No board with this name" });
        } else {
          console.log("data", data);
          const threads = data.threads.map((thread) => {
            const {
              _id,
              text,
              created_on,
              bumped_on,
              reported,
              delete_password,
              replies,
            } = thread;
            return {
              _id,
              text,
              created_on,
              bumped_on,
              reported,
              delete_password,
              replies,
              replycount: thread.replies.length,
            };
          });
          res.json(threads);
        }
      } catch (err) {
        console.log(err);
        res.json({ error: "There was an error fetching the board data" });
      }
    })
    .put(async (req, res) => {
      console.log("put", req.body);
      const { report_id } = req.body;
      const board = req.params.board;
      try {
        const boardData = await BoardModel.findOne({ name: board });
        if (!boardData) {
          res.json({ error: "Board not found" });
        } else {
          const date = new Date();
          let reportedThread = boardData.threads.id(report_id);
          reportedThread.reported = true;
          reportedThread.bumped_on = date;
          await boardData.save();
          res.send("Success");
        }
      } catch (err) {
        console.log(err);
        res.json({ error: "There was an error reporting the thread" });
      }
    })
    .delete(async (req, res) => {
      console.log("delete", req.body);
      const { thread_id, delete_password } = req.body;
      const board = req.params.board;
      try {
        const boardData = await BoardModel.findOne({ name: board });
        if (!boardData) {
          res.json({ error: "Board not found" });
        } else {
          let threadToDelete = boardData.threads.id(thread_id);
          if (threadToDelete.delete_password === delete_password) {
            boardData.threads.pull(thread_id);
            await boardData.save();
            res.send("Success");
          } else {
            res.send("Incorrect Password");
          }
        }
      } catch (err) {
        console.log(err);
        res.json({ error: "There was an error deleting the thread" });
      }
    });

  app
    .route("/api/replies/:board")
    .post(async (req, res) => {
      console.log("thread", req.body);
      const { thread_id, text, delete_password } = req.body;
      const board = req.params.board;
      const newReply = new ReplyModel({
        text: text,
        delete_password: delete_password,
      });

      try {
        const boardData = await BoardModel.findOne({ name: board });
        if (!boardData) {
          res.json({ error: "Board not found" });
        } else {
          const date = new Date();
          let threadToAddReply = boardData.threads.id(thread_id);
          threadToAddReply.bumped_on = date;
          threadToAddReply.replies.push(newReply);
          const updatedData = await boardData.save();
          res.json(updatedData);
        }
      } catch (err) {
        console.log(err);
        res.json({ error: "There was an error adding the reply" });
      }
    })
    .get(async (req, res) => {
      const board = req.params.board;
      try {
        const data = await BoardModel.findOne({ name: board });
        if (!data) {
          console.log("No board with this name");
          res.json({ error: "No board with this name" });
        } else {
          console.log("data", data);
          const thread = data.threads.id(req.query.thread_id);
          res.json(thread);
        }
      } catch (err) {
        console.log(err);
        res.json({ error: "There was an error fetching the thread data" });
      }
    })
    .put(async (req, res) => {
      const { thread_id, reply_id } = req.body;
      const board = req.params.board;
      try {
        const data = await BoardModel.findOne({ name: board });
        if (!data) {
          console.log("No board with this name");
          res.json({ error: "No board with this name" });
        } else {
          console.log("data", data);
          let thread = data.threads.id(thread_id);
          let reply = thread.replies.id(reply_id);
          reply.reported = true;
          reply.bumped_on = new Date();
          await data.save();
          res.send("Success");
        }
      } catch (err) {
        console.log(err);
        res.json({ error: "There was an error reporting the reply" });
      }
    })
    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      console.log("delete reply body", req.body);
      const board = req.params.board;
      try {
        const data = await BoardModel.findOne({ name: board });
        if (!data) {
          console.log("No board with this name");
          res.json({ error: "No board with this name" });
        } else {
          console.log("data", data);
          let thread = data.threads.id(thread_id);
          let reply = thread.replies.id(reply_id);
          if (reply.delete_password === delete_password) {
            thread.replies.pull(reply_id);
            await data.save();
            res.send("Success");
          } else {
            res.send("Incorrect Password");
          }
        }
      } catch (err) {
        console.log(err);
        res.json({ error: "There was an error deleting the reply" });
      }
    });
};

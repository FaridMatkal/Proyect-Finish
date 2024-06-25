'use strict';

const mongoose = require('mongoose');

module.exports = function (app) {
  const replySchema = new mongoose.Schema({
    created_on: String,
    text: String,
    delete_password: String,
    reported: Boolean
  });

  const Message = mongoose.model('Message', new mongoose.Schema({
    board: String,
    created_on: String,
    bumped_on: String,
    reported: Boolean,
    text: String,
    delete_password: String,
    replycount: Number,
    replies: [replySchema],
    password: String
  }));
  const Reply = mongoose.model('Reply', replySchema);

  app.route('/api/threads/:board')
    .get(async (req, res) => {
      try {
        const messages = await Message.find({ board: req.params.board })
          .select('-board')
          .sort({ bumped_on: -1 })
          .limit(10)
          .exec();
        
        const messagesConsolidate = messages.map(message => {
          const container = {};

          container._id = message._id;
          container.created_on = message.created_on;
          container.bumped_on = message.bumped_on;
          container.text = message.text;
          container.replycount = message.replycount;
          const repliesConsolidate = message.replies.slice(0, 3).map(reply => {
            const replyContainer = {};

            replyContainer._id = reply._id;
            replyContainer.created_on = reply.created_on;
            replyContainer.text = reply.text;

            return replyContainer;
          });
          container.replies = repliesConsolidate;

          return container;
        });
        res.json(messagesConsolidate);
      } catch (err) {
        console.log(err);
      }
    })
    .post(async (req, res) => {
      const newMessage = new Message({
        board: req.params.board,
        created_on: new Date().toISOString(),
        bumped_on: new Date().toISOString(),
        reported: false,
        text: req.body.text,
        delete_password: req.body.delete_password,
        replycount: 0,
        replies: []
      });
      await newMessage.save();
      res.json({
        _id: newMessage._id,
        created_on: newMessage.created_on,
        bumped_on: newMessage.bumped_on,
        reported: newMessage.reported,
        text: newMessage.text,
        delete_password: newMessage.delete_password,
        replycount: newMessage.replycount,
        replies: newMessage.replies
      });
    })
    .put(async (req, res) => {
      try {
        const docs = await Message.findOneAndUpdate(
          { board: req.params.board, _id: new mongoose.Types.ObjectId(req.body.report_id) },
          { reported: true },
          { useFindAndModify: false }
        );
        if (!docs) {
          res.send('reported'); 
        } else {
          res.send('reported');
        }
      } catch (err) {
        throw err;
      }
    })
    .delete(async (req, res) => {
      try {
        const doc = await Message.findOneAndDelete(
          { _id: new mongoose.Types.ObjectId(req.body.thread_id), delete_password: req.body.delete_password }
        );
        if (!doc) {
          res.send('incorrect password');
        } else {
          res.send('success');
        }
      } catch (err) {
        throw err;
      }
    });

  app.route('/api/replies/:board')
    .get(async (req, res) => {
      try {
        const messages = await Message.find({ board: req.params.board })
          .select('-board')
          .sort({ bumped_on: -1 })
          .limit(1)
          .exec();

        const container = {};

        container._id = messages[0]._id;
        container.created_on = messages[0].created_on;
        container.bumped_on = messages[0].bumped_on;
        container.text = messages[0].text;
        container.replycount = messages[0].replycount;
        const repliesConsolidate = messages[0].replies.map(reply => {
          const replyContainer = {};

          replyContainer._id = reply._id;
          replyContainer.created_on = reply.created_on;
          replyContainer.text = reply.text;

          return replyContainer;
        });
        container.replies = repliesConsolidate;

        res.json(container);
      } catch (err) {
        console.log(err);
      }
    })
    .post(async (req, res) => {
      const newReply = new Reply({
        created_on: new Date().toISOString(),
        text: req.body.text,
        delete_password: req.body.delete_password,
        reported: false
      });
      const doc = await Message.findOne({ board: req.params.board, _id: new mongoose.Types.ObjectId(req.body.thread_id) });
      doc.bumped_on = newReply.created_on;
      doc.replycount = doc.replycount + 1;
      doc.replies.push(newReply);
      await doc.save();
      res.json(doc);
    })
    .put(async (req, res) => {
      try {
        const doc = await Message.findOne(
          { board: req.params.board, _id: new mongoose.Types.ObjectId(req.body.thread_id) }
        );
        if (!doc) {
          res.send("invalid thread ID");
        } else {
          const result = doc.replies.findIndex(({ _id }) => {
            return JSON.stringify(_id) === `"${req.body.reply_id}"`;
          });
          if (isNaN(result)) {
            res.send('invalid reply ID');
          } else {
            doc.replies[result].reported = true;
            await doc.save();
            res.send('reported');
          }
        }
      } catch (err) {
        throw err;
      }
    })
    .delete(async (req, res) => {
      try {
        const doc = await Message.findOne(
          { board: req.params.board, _id: new mongoose.Types.ObjectId(req.body.thread_id) }
        );
        if (!doc) {
          res.send('invalid thread ID');
        } else {
          const result = doc.replies.findIndex(({ _id }) => {
            return JSON.stringify(_id) === `"${req.body.reply_id}"`;
          });
          if (isNaN(result)) {
            res.send('invalid reply ID');
          } else if (doc.replies[result].delete_password === req.body.delete_password) {
            doc.replies[result].text = '[deleted]';
            await doc.save();
            res.send('success');
          } else {
            res.send('incorrect password');
          }
        }
      } catch (err) {
        throw err;
      }
    });
};

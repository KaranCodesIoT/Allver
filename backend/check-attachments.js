const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Conversation = require('./models/Conversation');
  const convos = await Conversation.find({}).lean();
  convos.forEach(c => {
    const imgMsgs = c.messages.filter(m => m.attachment && m.attachment.url);
    console.log('Convo:', c._id.toString(), 'Total msgs:', c.messages.length, 'Attachment msgs:', imgMsgs.length);
    imgMsgs.forEach(m => console.log('  Attachment:', JSON.stringify(m.attachment)));
    // Also check messages that have attachment but no url
    const emptyAttach = c.messages.filter(m => m.attachment && !m.attachment.url);
    if (emptyAttach.length > 0) {
      console.log('  Messages with empty attachment:', emptyAttach.length);
      emptyAttach.forEach(m => console.log('    Empty attachment:', JSON.stringify(m.attachment), 'text:', m.text));
    }
  });
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });

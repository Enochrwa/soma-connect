import { Schema, model, type InferSchemaType } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: String,
    link: String,
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & { _id: string };
export const Notification = model("Notification", NotificationSchema);
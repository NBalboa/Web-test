import Colors from "@/common/colors";
import Images from "@/common/images";
import Modal from "@/components/Modal";
import TextInput from "@/components/TextInput";
import useCollectionObserver from "@/hooks/useCollectionObserver";
import useKeyListener from "@/hooks/useKeyListener";
import { useAuth } from "@/services/context/AuthContext";
import { googleSignIn } from "@/services/firebase/auth";
import { createDocument, createId } from "@/services/firebase/firestore";
import { MessageType } from "@/types";
import { sanitizeString } from "@/utils/functions";
import { TSDate, UTCDate } from "@/utils/variables";
import React, { useCallback, useEffect, useRef, useState } from "react";
import MessageRow from "./components/MessageRow";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase/config";
import { limit, orderBy, startAfter } from "firebase/firestore";

const Pagination = () => {
  const { Auth, logout } = useAuth();
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [loadMessage, setLoadMessages] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageType | null>(null);
  const chatCurrentRef = useRef<HTMLDivElement>(null);
  const Messages = useCollectionObserver<MessageType>({
    Collection: "messages",
    Condition: [
      orderBy("createdAt", "desc"),
      loadMessage && lastMessage ? startAfter(lastMessage.createdAt) : null,
      limit(20),
    ].filter(Boolean),
    Dependencies: [loadMessage],
    ReplaceOld: false,
  });

  const sendMessage = useCallback(async () => {
    if (!Auth) return;
    const sanitized = sanitizeString(message);
    if (typeof message !== "string" || sanitized.trim() === "")
      return setMessageError(true);
    await createDocument<MessageType>({
      Collection: "messages",
      Data: {
        authorId: Auth.uid,
        createdAt: TSDate(),
        id: createId("messages"),
        message: sanitized,
      },
    });
    setMessage("");
  }, [message, Auth]);

  const handleSend = useCallback(async () => {
    if (!Auth)
      await googleSignIn().then((response) => {
        if (response.status !== 200) alert(response.message);
        else sendMessage();
      });
    else sendMessage();
  }, [Auth, sendMessage]);

  useKeyListener({
    key: "Enter",
    callback: handleSend,
    dependencies: [handleSend, Auth],
  });

  useEffect(() => {
    const chatRef = chatCurrentRef.current;

    if (chatRef) {
      const handleScroll = () => {
        const scrollTop = chatRef.scrollTop;
        const scrollHeight = chatRef.scrollHeight;
        const clientHeight = chatRef.clientHeight;

        if (Math.abs(scrollTop) + clientHeight >= scrollHeight) {
          setLoadMessages(true);
        }
      };
      chatRef?.addEventListener("scroll", handleScroll);

      return () => chatRef?.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    if (Messages.length > 0) {
      setLoadMessages(false);
      setLastMessage(Messages[Messages.length - 1]);
    }
  }, [Messages]);

  return (
    <>
      <div
        style={{
          background: Colors.black500,
          top: `${innerHeight / 4}px`,
          left: `calc(50% - 200px)`,
        }}
        className="m-auto br-15px card text-center w-400px h-min-400px h-50vh absolute col gap-5px"
      >
        <div
          ref={chatCurrentRef}
          className="col-reverse gap-3px h-100p overflow-y-scroll visible-scrollbar"
        >
          {Messages.map((msg) => (
            <MessageRow message={msg} key={msg.id} />
          ))}
        </div>
        <div className="row-center">
          <TextInput
            value={message}
            setValue={(e) => {
              setMessage(e.target.value);
              if (messageError) setMessageError(false);
            }}
            error={messageError}
            inputClassName="bootstrap-input"
            containerClassName="m-3px w-100p"
          />
          <button
            onClick={handleSend}
            className="h-30px w-30px"
            style={{ background: Colors.transparent }}
            type="button"
          >
            <img
              className="h-25px w-25px mr-3px"
              src={Images["ic_send_white"]}
            />
          </button>
        </div>
      </div>
      {Auth ? (
        <button
          style={{
            bottom: "100px",
            left: "calc(50% - 39px)",
            border: "1px solid " + Colors.white,
          }}
          onClick={logout}
          className="absolute br-3px pv-5px ph-15px"
          type="button"
        >
          Logout
        </button>
      ) : null}
    </>
  );
};

export default Pagination;

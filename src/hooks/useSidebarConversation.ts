import { TweetRelation } from "@/types/tweet";
import { RefObject, useLayoutEffect, useRef, useState } from "react";

interface UseSidebarConversationParams {
  isOpen: boolean;
  conversationId: string | null;
  tweetRelation: TweetRelation | null;
  scrollAreaRef: RefObject<HTMLDivElement>;
}

export interface ConversationState {
  conversationId?: string;
  inSameConversation: boolean;
}

export interface SidebarConversationResult {
  stateRef: RefObject<ConversationState>;
  version: number;
}

export const useSidebarConversation = ({
  isOpen,
  conversationId,
  tweetRelation,
  scrollAreaRef,
}: UseSidebarConversationParams): SidebarConversationResult => {
  const conversationStateRef = useRef<ConversationState>({
    conversationId: undefined,
    inSameConversation: false,
  });
  const [version, setVersion] = useState(0);

  useLayoutEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    if (!conversationId) {
      scrollArea.scrollTop = 0;
      const { conversationId: previousId, inSameConversation } =
        conversationStateRef.current;
      if (previousId !== undefined || inSameConversation !== false) {
        conversationStateRef.current.conversationId = undefined;
        conversationStateRef.current.inSameConversation = false;
        setVersion((previous) => previous + 1);
      }
      return;
    }

    const sameConversation =
      conversationId === conversationStateRef.current.conversationId;
    conversationStateRef.current.conversationId = conversationId;
    conversationStateRef.current.inSameConversation = sameConversation;

    if (sameConversation) {
      return;
    }

    if (!tweetRelation || !tweetRelation.replyTo) scrollArea.scrollTop = 0;
    setVersion((previous) => previous + 1);
  }, [scrollAreaRef, conversationId, tweetRelation]);

  useLayoutEffect(() => {
    if (isOpen) return;
    const { conversationId: previousId, inSameConversation } =
      conversationStateRef.current;
    if (previousId !== undefined || inSameConversation !== false) {
      conversationStateRef.current.conversationId = undefined;
      conversationStateRef.current.inSameConversation = false;
      setVersion((previous) => previous + 1);
    }
  }, [isOpen]);

  return { stateRef: conversationStateRef, version };
};

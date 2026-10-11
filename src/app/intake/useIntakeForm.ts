"use client";

import { useRef, useState } from "react";
import type { ReachOption, SampleItem } from "./IntakeViews";

export function useIntakeForm() {
  const [clue, setClue] = useState("");
  const [img, setImg] = useState<string>("/img/generic.jpg");
  const [notes, setNotes] = useState("");
  const [reach, setReach] = useState<ReachOption>("auto");
  const [shotTaken, setShotTaken] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);

  function onCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImg(String(reader.result));
      setShotTaken(true);
    };
    reader.readAsDataURL(file);
  }

  function onSelectSample(s: SampleItem) {
    setImg(s.img);
    setShotTaken(true);
    if (!clue) setClue(s.clue);
  }

  return {
    clue,
    setClue,
    img,
    setImg,
    notes,
    setNotes,
    reach,
    setReach,
    shotTaken,
    setShotTaken,
    cameraRef,
    onCapture,
    onSelectSample,
  };
}

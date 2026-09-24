"use client";

import { useRouter } from "next/navigation";
import { useIntake } from "./useIntake";
import {
  DonePhaseView,
  IntakeHeader,
  IntakePhaseView,
  QuestionsPhaseView,
} from "./IntakeViews";

export default function IntakePage() {
  const router = useRouter();
  const {
    clue,
    setClue,
    img,
    notes,
    setNotes,
    reach,
    setReach,
    phase,
    busy,
    item,
    questions,
    answers,
    setAnswers,
    shotTaken,
    cameraRef,
    onCapture,
    onSelectSample,
    analyze,
    submitAnswers,
  } = useIntake();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <IntakeHeader />

      {phase === "intake" && (
        <IntakePhaseView
          clue={clue}
          setClue={setClue}
          img={img}
          notes={notes}
          setNotes={setNotes}
          reach={reach}
          setReach={setReach}
          shotTaken={shotTaken}
          busy={busy}
          cameraRef={cameraRef}
          onCapture={onCapture}
          onSelectSample={onSelectSample}
          onAnalyze={() => analyze()}
        />
      )}

      {phase === "questions" && (
        <QuestionsPhaseView
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          busy={busy}
          onSubmitAnswers={submitAnswers}
        />
      )}

      {phase === "done" && item && (
        <DonePhaseView
          item={item}
          onSeeOperation={() => router.push(`/item/${item.id}`)}
          onViewListing={() => router.push(`/market/${item.id}`)}
        />
      )}
    </div>
  );
}

import { useSyncExternalStore } from "react";
import { getBloodPressureNotice, subscribeBloodPressureNotice } from "@generick/shared";

const MESSAGES = {
    movement: {
        title: "Movement detected",
        body: "Sit still with your arm resting on the table, then measure again.",
    },
    invalid: {
        title: "Reading looks unusual",
        body: "Check that the cuff is snug at heart level, then measure again.",
    },
} as const;

/** Tells the patient why their last blood pressure reading was not used. */
export default function BloodPressureNotice() {
    const notice = useSyncExternalStore(subscribeBloodPressureNotice, getBloodPressureNotice);
    if (!notice) return null;
    const message = MESSAGES[notice];
    return (
        <div
            role="alert"
            className="mt-6 w-full max-w-sm rounded-2xl border-2 border-amber-600 bg-amber-100 px-5 py-4 text-center text-amber-900"
        >
            <div className="text-lg font-bold">{message.title}</div>
            <p className="mt-1 text-base">{message.body}</p>
        </div>
    );
}

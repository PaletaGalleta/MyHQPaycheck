export const SHIFT_TYPE_SCHEDULE = 1;
export const SHIFT_TYPE_ADHERENCE = 2;

/**
 * @class TimeSpan Class for periods of time on the adherence page on Impact360
 */
export class TimeSpan {
    /**
     * Constructor
     *
     * @param {string} type     - The Code of the timespan
     * @param {number} duration - The duration of the timespan
     */
    constructor(type, duration) {
        /** The Code of the timespan */
        this.type = type;

        /** The duration of the timespan */
        this.duration = duration;
    }
}

export class Call {
    /**
     * Constructor
     *
     * @param {number} duration     - The duration (in ms) of the call
     * @param {string} startTime    - The time the call started
     * @param {string} endTime      - The time the call ended
     * @param {boolean} report      - Whether the call was reported or not
     */
    constructor(duration, startTime, endTime, report) {
        /** The duration (in ms) of the call */
        this.duration = duration;

        /** The time the call started */
        this.startTime = startTime;

        /** The time the call ended */
        this.endTime = endTime;

        /** Whether the call was reported or not */
        this.report = report;
    }
}

export class Shift {
    /**
     * Constructor
     *
     * @param {Date} date - The date of the shift
     */
    constructor(date) {
        /** The type of shift (schedule or adherence) */
        this.type = SHIFT_TYPE_ADHERENCE;

        /** The date of the Shift */
        this.date = date;

        /** Array of Calls of the shift */
        this.calls = [];

        /** Array of Timespans of the Shift */
        this.shift = [];

        /** @property {number} The total time the interpreter was available */
        this.availableTime = 0;

        /** The amount (in ms) of the longest call */
        this.highestDuration = 0;

        /** The amount (in ms) of the shortest call */
        this.lowestDuration = 9999999;

        /** The amount (in ms) of the total duration of all calls */
        this.totalDuration = 0;

        /** The average duration (in ms) of all the calls */
        this.avgDuration = 0;

        /** The amount of call reports on that day */
        this.reports = 0;
    }

    /**
     * Sets the shift information according to Personal->Schedule on Impact360
     *
     * @deprecated This reverts the object to type SHIFT_TYPE_SCHEDULE
     *
     * @param {JSON} mins       - JSON containing the minute information such as AP, break, immediate,
     *                              lunch, overtime, training
     * @param {JSON} shift      - JSON containing the shift information such as end, realEnd, realStart, start
     * @param {string} code     - The type of shift (Impact code)
     */
    setShift(code, mins = undefined, shift = undefined) {
        this.type = SHIFT_TYPE_SCHEDULE;

        /** The type of shift (Impact code) */
        this.code = code;

        /** JSON containing the minute information such as AP, break, immediate, lunch, overtime, training */
        this.mins = mins;

        /** JSON containing the shift information such as end, realEnd, realStart, start */
        this.schedule = shift;
    }

    /**
     * Adds a call to the shift
     *
     * @param {Call} call - The call to add to the shift
     */
    addCall(call) {
        this.calls.push(call);
        if (call.report) this.reports++;
        this.totalDuration += call.duration;
        if (call.duration > this.highestDuration) this.highestDuration = call.duration;
        if (call.duration < this.lowestDuration) this.lowestDuration = call.duration;
        this.avgDuration = Math.floor(this.totalDuration / this.calls.length);
    }

    /**
     * Adds or updates the timespans on the shift
     *
     * @param {TimeSpan} timeSpan - The time span to add to the shift
     */
    addTimeSpan(timeSpan) {
        if (this.shift.length > 0) {
            // Get last index
            const lastIndex = this.shift.length - 1;
            // Get last Timespan on the array
            const lastTimeSpan = this.shift[lastIndex];

            // If the type is the same, add the duration to what is already there
            if (lastTimeSpan.type === timeSpan.type) this.shift[lastIndex].duration += timeSpan.duration;
            else this.shift.push(timeSpan);
        } else this.shift.push(timeSpan);
    }
}

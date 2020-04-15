import './components/casper-calendar-selector.js';
import { CASPER_CALENDAR_MODES } from './casper-calendar-constants.js';
import { CasperCalendarItemsMixin } from './mixins/casper-calendar-items-mixin.js';
import { CasperCalendarPaintMixin } from './mixins/casper-calendar-paint-mixin.js';
import { CasperCalendarMouseEventsMixin } from './mixins/casper-calendar-mouse-events-mixin.js';
import { CasperCalendarActiveDatesMixin } from './mixins/casper-calendar-active-dates-mixin.js';

import moment from 'moment/src/moment.js';
import '@casper2020/casper-icons/casper-icon.js';
import { PolymerElement, html } from '@polymer/polymer/polymer-element.js';
import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';

class CasperCalendar extends CasperCalendarItemsMixin(
  CasperCalendarPaintMixin(
    CasperCalendarMouseEventsMixin(
      CasperCalendarActiveDatesMixin(PolymerElement)))) {

  static get is () {
    return 'casper-calendar';
  }

  static get properties () {
    return {
      /**
       * The global application's app object.
       *
       * @type {Object}
       */
      app: {
        type: Object,
        value: window.app
      },
      /**
       * The year that is currently being displayed on the calendar.
       *
       * @type {Number}
       */
      year: {
        type: Number,
        notify: true,
        value: new Date().getFullYear(),
        observer: '__yearChanged'
      },
      /**
       * The date range that is currently active.
       *
       * @type {Array}
       */
      activeDates: {
        type: Array,
        value: [],
        notify: true
      },
      /**
       * The list of items for each month of the current year.
       *
       * @type {Object}
       */
      items: {
        type: Object,
        observer: '__itemsChanged'
      },
      /**
       * This property contains the resource that will return the list of holidays for the calendar.
       *
       * @type {Array}
       */
      holidaysResource: {
        type: String,
        observer: '__holidaysResourceChanged'
      },
      /**
       * This property contains the name of the JSON API resource property which represents the year we're fetching the holidays from.
       *
       * @type {String}
       */
      holidaysResourceYearFilter: {
        type: String,
        value: 'year'
      },
      /**
       * When this flag is set to true, the buttons that navigate throughout the years disappear.
       *
       * @type {Boolean}
       */
      disableYearNavigation: {
        type: Boolean,
        value: false
      },
      /**
       * This property when set, limits the number of active dates can be selected simultaneously.
       */
      maximumNumberActiveDates: {
        type: Number
      },
      /**
       * Name of internal property that will be used to identify items and intervals.
       *
       * @type {String}
       */
      idInternalProperty: {
        type: String,
        value: '__identifier'
      },
      /**
       * The mode in which the calendar currently is which by default is days.
       *
       * @type {String}
       */
      mode: {
        type: String,
        value: CASPER_CALENDAR_MODES.DAYS
      },
      /**
       * This array contains the list of holidays.
       */
      __holidays: {
        type: Array,
        value: []
      },
      /**
       * This array contains the rows that are currently expanded.
       *
       * @type {Array}
       */
      __expandedMonths: {
        type: Array,
        value: []
      },
      /**
       * This flag states if the component is still in the middle of its first paint.
       *
       * @type {Boolean}
       */
      __isComponentInitializing: {
        type: Boolean,
        value: true
      }
    }
  }

  static get template () {
    return html`
      <style>
        #main-container {
          display: flex;
          flex-grow: 1;
          user-select: none;
          flex-direction: column;
        }

        #main-container .row-container {
          display: none;
          grid-template-rows: 30px;
        }

        #main-container .row-container .cell {
          flex: 1;
          border: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          font-size: var(--casper-calendar--cell-font-size, 14px);
          position: relative;
          box-sizing: border-box;
          border: 1px #F2F2F2 solid;
        }

        /*
        #main-container .row-container .cell:not(.cell--left-header):not(.cell--top-header)[active] {
          color: var(--on-primary-color);
          background-color: var(--primary-color);
        }
        */

        #main-container .row-container .cell:not(.cell--left-header):not(.cell--top-header):hover {
          cursor: pointer;
          box-shadow: 1px 1px 7px #999999;
        }

        #main-container .row-container .cell.cell--today {
          color: white;
          background-color: orange;
        }

        #main-container .row-container .cell.cell--weekend {
          color: red;
          background-color: #E4E4E4;
        }

        #main-container .row-container .cell.cell--left-header {
          padding: 0 10px;
          align-items: center;
          justify-content: space-between;
          background-color: #E4E4E4;
          color: var(--primary-color);
        }

        #main-container .row-container .cell.cell--has-item .cell-content {
          background-color: rgba(var(--primary-color-rgb), 0.2);
        }

        #main-container .row-container .cell .cell-content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #main-container .row-container .cell.cell--left-header .month-items-toggle {
          display: flex;
          cursor: pointer;
          align-items: center;
        }

        #main-container .row-container .cell.cell--left-header .month-items-toggle:hover {
          color: var(--dark-primary-color);
        }

        #main-container .row-container .cell.cell--left-header .month-items-toggle casper-icon {
          width: 15px;
          height: 15px;
          color: var(--primary-color);
        }

        #main-container .row-container .cell.cell--left-header .month-items-toggle:hover casper-icon {
          color: var(--dark-primary-color);
        }

        #main-container .row-container .cell.cell--left-header.cell--year-header {
          justify-content: space-around;
        }

        #main-container .row-container .cell.cell--left-header.cell--year-header casper-icon {
          width: 15px;
          height: 15px;
          cursor: pointer;
          color: var(--primary-color);
        }

        #main-container .row-container .cell.cell--top-header {
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #E4E4E4;
          color: var(--primary-color);
        }

        #main-container .row-container .cell.cell--top-header.cell--weekend {
          color: red;
          background-color: #E4E4E4;
        }

        #main-container .row-container .cell .holiday {
          right: 0;
          bottom: 0;
          position: absolute;
          width: 13px;
          height: 13px;
          padding-top: 1px;
          padding-left: 1px;
          font-size: 8px;
          line-height: 13px;
          color: white;
          display: flex;
          opacity: 0.75;
          box-sizing: border-box;
          border-radius: 12px 3px 3px 3px;
          justify-content: center;
          background-color: #FF5000;
        }

        /* Item row styling */
        .item-row-container {
          display: grid;
          grid-template-rows: 30px;
        }

        .item-row-container:hover {
          background-color: rgba(200, 200, 200, 0.1);
        }

        .item-row-container > div {
          box-sizing: border-box;
          border: 1px #F2F2F2 solid;
        }

        .item-row-container > div:first-of-type {
          flex-grow: 0;
          flex-shrink: 0;
          flex-basis: 10%;
          padding: 0 10px;
          font-size: 14px;
          display: flex;
          align-items: center;
          color: var(--primary-color);
        }

        .item-row-container > div:not(:first-of-type) {
          flex: 1;
          height: 30px;
        }
      </style>

      <casper-calendar-selector
        id="selector"
        mode="[[mode]]"
        type="{{__intervalType}}"
        custom-value="{{__intervalCustomValue}}"
        background-color="{{__intervalBackgroundColor}}">
      </casper-calendar-selector>

      <div id="main-container">
        <div class="row-container">
          <!--Year selector-->
          <div class="cell cell--left-header cell--year-header">
            <template is="dom-if" if="[[!disableYearNavigation]]">
              <casper-icon icon="fa-light:chevron-double-left" on-click="__decrementYear"></casper-icon>
            </template>
            [[year]]
            <template is="dom-if" if="[[!disableYearNavigation]]">
              <casper-icon icon="fa-light:chevron-double-right" on-click="__incrementYear"></casper-icon>
            </template>
          </div>

          <!--Week days column headers-->
          <template is="dom-repeat" items="[[__weekDays]]" as="weekDay">
            <div class$="cell cell--top-header [[__isWeekend(weekDay.weekDay)]]">[[weekDay.weekDayName]]</div>
          </template>
        </div>

        <template is="dom-repeat" items="[[__months]]" as="month" id="templateRepeat">
          <div class="row-container" data-month$="[[month.index]]">
            <!--Month left column header-->
            <div class="cell cell--left-header">[[month.name]]</div>

            <template is="dom-repeat" items="[[__getMonthDays(index)]]" as="monthDay">
              <div
                data-month$="[[month.index]]"
                data-day$="[[monthDay.index]]"
                on-mouseup="__cellOnMouseUp"
                on-mousedown="__cellOnMouseDown"
                on-mouseenter="__cellOnMouseEnter"
                class$="cell [[__isWeekend(monthDay.weekDay)]]">
                  <div class="cell-content">[[monthDay.index]]</div>
              </div>
            </template>
          </div>
        </template>
      </div>

      <template id="item-row-template">
        <div style$="[[itemRowContainerStyle]]" class="item-row-container">
          <div>[[title]]</div>
          <template is="dom-repeat" items="[[intervals]]" as="interval">
            <div style$="[[interval.styles]]" tooltip="[[interval.tooltip]]"></div>
          </template>
        </div>
      </template>
    `;
  }

  ready () {
    super.ready();
    window.calendar = this;
    this.addEventListener('mousemove', event => this.app.tooltip.mouseMoveToolip(event));
    this.$.templateRepeat.addEventListener('dom-change', () => {
      afterNextRender(this, () => {
        const rows = this.shadowRoot.querySelectorAll('.row-container');

        // Check if all the rows are already on the screen (the header one plus one for each month).
        if (rows.length !== 13) return;
        this.__isComponentInitializing = false;

        // Apply the grid styling taking into account the number of columns.
        this.shadowRoot.querySelectorAll('.row-container').forEach(rowContainer => {
          rowContainer.style.display = 'grid';
          rowContainer.style.gridTemplateColumns = `10% repeat(${this.__numberOfColumns}, 1fr)`;
        });

        this.__itemsChanged();
        this.__paintTodayCell();
        this.__paintActiveDates();
        this.__paintHolidayCells();
      });
    });
  }

  /**
   * This method sets the active dates and formats each one to contain the list of days.
   *
   * @param {Array} activeDates The list of active dates.
   */
  setActiveDates (activeDates) {
    this.activeDates = activeDates.map(activeDate => {
      const activeDateEnd = moment.isMoment(activeDate.end) ? activeDate.end : moment(activeDate.end);
      const activeDateStart = moment.isMoment(activeDate.start) ? activeDate.start : moment(activeDate.start);

      return {
        ...activeDate,
        start: activeDateStart,
        end:  activeDateEnd,
        days: this.__getDaysBetweenDates(activeDateStart, activeDateEnd)
      };
    });

    this.__paintActiveDates();
  }

  /**
   * This method gets invoked as soon as the year changes.
   *
   * @param {Number} year The current year.
   */
  __yearChanged (year) {
    const months = [];
    this.__numberOfColumns = 31;

    const yearFirstWeekDay = new Date(year, 0, 1).getDay();

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      months.push({
        index: monthIndex,
        name: moment.months()[monthIndex].substring(0, 3),
      });

      // Get the month's number of days and its first week day.
      const firstDayOfMonth = moment(new Date(year, monthIndex, 1));
      const monthNumberOfDays = firstDayOfMonth.daysInMonth();
      const monthFirstWeekDay = firstDayOfMonth.day();

      // Get all the weekdays for every single day of the month.
      const monthDays = [];
      for (let dayIndex = 0; dayIndex < monthNumberOfDays; dayIndex++) {
        monthDays.push({
          index: dayIndex + 1,
          weekDay: (monthFirstWeekDay + dayIndex) % 7
        });
      }

      if (yearFirstWeekDay === monthFirstWeekDay) {
        months[monthIndex].days = monthDays;
      } else {
        // Calculate how many days between the year's first week day and this month's first week day.
        let offset = monthFirstWeekDay >= yearFirstWeekDay
          ? monthFirstWeekDay - yearFirstWeekDay
          : monthFirstWeekDay + (7 - yearFirstWeekDay);

        months[monthIndex].days = new Array(offset).concat(monthDays);
      }
    }

    this.__numberOfColumns = Math.max(...months.map(monthWeekdays => monthWeekdays.days.length));

    // Build the weekdays that will appear at the top of the page taking into account the first day of the year.
    const weekDays = [];
    for (let columnIndex = 0; columnIndex < this.__numberOfColumns; columnIndex++) {
      const currentWeekday = (yearFirstWeekDay + columnIndex) % 7;

      weekDays.push({
        weekDay: currentWeekday,
        weekDayName: moment.weekdays()[currentWeekday].charAt(0)
      });
    }

    this.__months = this.__weekDays = this.__holidays = [];

    afterNextRender(this, () => {
      this.__months = months;
      this.__weekDays = weekDays;

      // Fetch holidays for the current year.
      this.__holidaysResourceChanged();
    });
  }

  /**
   * This method returns the formatted month's week days already padded in the beginning and in the end.
   *
   * @param {Number} month The month whose week days will be returned.
   */
  __getMonthDays (month) {
    return this.__months[month].days.length === this.__numberOfColumns
      ? this.__months[month].days
      : this.__months[month].days.concat(new Array(this.__numberOfColumns - this.__months[month].days.length));
  }

  /**
   * This method increments the current year by one.
   */
  __incrementYear () {
    this.year++;
  }

  /**
   * This method decrements the current year by one.
   */
  __decrementYear () {
    this.year--;
  }

  /**
   * This method receives an weekDay as a parameter and returns the CSS class 'cell--weekend' if that day
   * is either Saturday or Sunday.
   *
   * @param {Number} weekDay The weekday that will be checked to see if it's either Saturday or Sunday.
   */
  __isWeekend (weekDay) {
    return weekDay === 0 || weekDay === 6 ? 'cell--weekend' : '';
  }

  /**
   * This method returns the list of days between two dates.
   *
   * @param {Object} startDate The start date.
   * @param {Object} endDate The end date.
   */
  __getDaysBetweenDates (startDate, endDate) {
    const activeDateDays = [];

    this.__executeForEachDayBetweenDates(currentDate => {
      activeDateDays.push({
        day: currentDate.date(),
        month: currentDate.month(),
        isWeekend: [0, 6].includes(currentDate.day()),
        isHoliday: this.__holidays.some(holiday => currentDate.month() === (holiday.month - 1) && currentDate.date() === holiday.day)
      });
    }, startDate, endDate);

    return activeDateDays;
  }

  /**
   * This method gets invoked when the property holidays changes.
   */
  async __holidaysResourceChanged () {
    if (!this.holidaysResource) return;

    try {
      const holidaysResource = this.holidaysResource.includes('?')
        ? `${this.holidaysResource}&filter[${this.holidaysResourceYearFilter}]=${this.year}`
        : `${this.holidaysResource}?filter[${this.holidaysResourceYearFilter}]=${this.year}`;

      const socketResponse = await this.app.socket.jget(holidaysResource);

      this.__holidays = socketResponse.data;
      this.__paintHolidayCells();
    } catch (error) {
      console.error(error);

      this.app.openToast({ text: 'Ocorreu um erro ao obter os dados.', backgroundColor: 'red' });
    }
  }

  /**
   * This method will execute a callback for each day between two dates.
   *
   * @param {Function} callback The callback that will be executed for each day between both dates.
   * @param {Object} startDate The start date.
   * @param {Object} endDate The end date.
   * @param {Boolean} skipDifferentYears This flag will decide if the callback will be invoked when we're iterating over an year that isn't the current one.
   */
  __executeForEachDayBetweenDates (callback, startDate, endDate, skipDifferentYears = false) {
    // Sort both dates because the user can select the dates backwards.
    const [sortedStartDate, sortedEndDate] = [startDate, endDate].sort((a, b) => a.diff(b));
    const daysBetweenBothDates = sortedEndDate.diff(sortedStartDate, 'days');

    // If the interval does not contain the current year, there's no point in looping through its days.
    if (skipDifferentYears && (
      (sortedStartDate.year() < this.year && sortedEndDate.year() < this.year) ||
      (sortedStartDate.year() > this.year && sortedEndDate.year() > this.year))) return;

    for (let dayCount = 0; dayCount <= daysBetweenBothDates; dayCount++) {
      const currentDate = moment(sortedStartDate).add(dayCount, 'days');

      // Either skip to the next iteration if we're in previous years or exit if we already surpassed it.
      if (skipDifferentYears) {
        if (currentDate.year() < this.year) continue;
        if (currentDate.year() > this.year) return;
      }

      callback(currentDate);
    }
  }

  /**
   * This method is used to internally change the value of a property "without" triggering its observer.
   *
   * @param {String} propertyName The name of the property that will be changed.
   * @param {String | Number  | Boolean | Object} propertyValue The new value that the propery will have.
   */
  __internallyChangeProperty (propertyName, propertyValue) {
    const propertyLockName = `__${propertyName}Lock`;

    this[propertyLockName] = true;
    this[propertyName] = propertyValue;
    this[propertyLockName] = false;
  }
}

customElements.define(CasperCalendar.is, CasperCalendar);
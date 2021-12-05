import { Component, OnInit } from '@angular/core';

import {
  Firestore,
  collectionData,
  collection,
  doc,
  docData,
} from '@angular/fire/firestore';

import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';

import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { Observable, Subscription } from 'rxjs';
import { FormGroup, FormsModule } from '@angular/forms';

import { Chart } from 'angular-highcharts';

import { addDays, format } from 'date-fns';
import * as _ from 'lodash';
import { Dictionary } from 'highcharts';

interface Meaning {
  meaning: String;
  sentences: String[];
}
interface Word {
  id: string;
  meanings: Meaning[];
  language: String;
  word: String;
}

interface RandomQuestion {
  word: String;
  random_meanings: String[];
  submission?: String;
  submitted?: boolean;
  is_correct?: boolean;
  created_at: number;
  marked_at: number | undefined;
}
const CORRECT_ANSWERS_INDEX = 3;
const WRONG_ANSWERS_INDEX = 4;

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit {
  words: Observable<Word[]>;
  user: AngularFirestoreDocument<any>;
  selected_index: number | undefined;
  selected_word: Word | undefined;
  random_word_value: String | undefined;
  random_word_options: String[] | undefined;
  meaning_option_selected: String | undefined;
  random_option_radio_val: string = '';
  random_question: RandomQuestion;
  random_word: Word | undefined;
  performance_sub: Subscription | undefined;
  sim_marked_at: Date | undefined;
  use_fixed_marked_at: boolean = false;

  chart: Chart;

  constructor(private firestore: AngularFirestore) {
    this.user = this.firestore.doc('users/t5T6rO3NCEbLJQZfj5st');
    this.words = this.user.collection<Word>('words').valueChanges();
    this.random_question = this.initializeRandomQuestion();
    this.chart = this.makeChart([], []);
    this.sim_marked_at = new Date();

    console.log(this.words);
  }

  ngOnInit() {}

  fetchHistory() {
    //use firebase
  }

  loadWord(word: Word, word_detailes_tab_index: number) {
    console.log(word);
    this.selected_word = word;
    this.selected_index = word_detailes_tab_index;
  }

  // random module

  //pick random word
  randomWordEngine() {
    console.log('random engine triggered');

    this.words.subscribe((words) => {
      this.random_question = this.initializeRandomQuestion();
      let random_word = words[this.randomLessThan(words.length)];

      let options = new Set();

      //add first meaning to options
      let correct_meaning =
        random_word.meanings[this.randomLessThan(random_word.meanings.length)]
          .meaning;

      let all_meanings = words
        .map((word) => word.meanings.map(({ meaning }) => meaning))
        .reduce((acc, meanings_group) => [...acc, ...meanings_group], []);

      console.log(all_meanings);

      options.add(correct_meaning);

      let attempts = 0;
      while (attempts++ < 5 && options.size < 3)
        options.add(all_meanings[this.randomLessThan(all_meanings.length)]);

      this.random_word = random_word;
      // this.random_word_options = this.randomizeArray([...options.values()]);

      this.random_question = {
        ...this.random_question,
        word: random_word.word,
        random_meanings: this.randomizeArray([...options.values()]),
      };
    });
  }

  submitRandomForm(event: Event, random_question: RandomQuestion) {
    event.preventDefault();
    if (!random_question || !this.random_word) return;

    console.log(random_question);

    random_question.submitted = true;
    random_question.is_correct = this.isAnswerCorrect(
      this.random_word,
      random_question.submission ?? ''
    );

    //add to firestore random_evaluations
    this.user.collection('random_quizes').add({
      ...random_question,
      marked_at: this.use_fixed_marked_at
        ? this.sim_marked_at?.getTime()
        : new Date().getTime(),
    });
  }

  private isAnswerCorrect(word: Word, candidate_answer: String) {
    return word.meanings
      .map(({ meaning }) => meaning.toLowerCase())
      .includes(candidate_answer.toLowerCase());
  }

  initializeRandomQuestion() {
    return {
      random_meanings: [],
      word: '',
      submission: '',
      created_at: new Date().getTime(),
      marked_at: undefined,
    };
  }

  /**
   * @returns  random number less than the value given
   */
  private randomLessThan(size: number): number {
    if (size == 0) throw new Error('Invalid parameter value');

    let result;

    do {
      result = Math.floor(Math.random() * size);
    } while (result >= size);

    return result;
  }

  /**
   *
   * @returns the randomized version of the input array
   */
  private randomizeArray(_array: Array<any>): [] {
    let result = new Set();

    while (result.size < _array.length)
      result.add(_array[this.randomLessThan(_array.length)]);

    return <any>[...result.values()];
  }

  last7days() {
    //stop if subscription exists
    if (this.performance_sub) return;

    console.log('subbing to answered_questions');

    // milliseconds * seconds * minutes * hours * days
    let _7days_in_ms = this.getMilliSeconds(60, 60, 24, 7);
    let last_week_date = new Date(Date.now() - _7days_in_ms);
    let last_week_ms = last_week_date.getTime();

    this.performance_sub = this.user
      .collection('random_quizes', (ref) =>
        ref.orderBy('marked_at', 'desc').where('marked_at', '>', last_week_ms)
      )
      .valueChanges()
      .subscribe((answered_questions) => {
        answered_questions = answered_questions.map((q) => ({
          ...q,
          day_of_year: format(new Date(q.marked_at), 'EEE yyy-MM-dd'),
        }));

        let grouped_answered_questions: _.AnyKindOfDictionary = {
          ...this.makeWeekFillers(last_week_date),
          ..._.groupBy(answered_questions, (aq) => aq.day_of_year),
        };

        let data_series = Object.entries(grouped_answered_questions)
          .map(
            ([key, aq_group]): [
              date_key: string,
              totalQuestions: number,
              timestamp: number,
              answered_correct: number,
              answered_wrong: number
            ] => [
              key,
              aq_group.length,
              new Date(key).getTime(),
              aq_group.filter((q: RandomQuestion) => q.is_correct).length,
              aq_group.filter((q: RandomQuestion) => !q.is_correct).length,
            ]
          )
          .sort((a, b) => a[2] - b[2]);

        let categories = data_series.map((data) => data[0]);

        this.chart = this.makeChart(data_series, categories);
        console.log(data_series);
      });
  }

  private makeWeekFillers(last_week_date: Date) {
    let result = {};

    let i = 0;
    while (i < 9) {
      let next_date: Date = addDays(last_week_date, i++);
      let key = format(next_date, 'EEE yyyy-MM-dd');
      result = { ...result, ...{ [key]: [] } };
    }

    return result;
  }

  /**
   * @param0 seconds
   * @param1 minutes
   * @param2 hours
   * @param3 days
   * @returns milliseconds total of the inputes provided
   */
  private getMilliSeconds(...time: Array<number>): number {
    if (!time.length) throw new Error('provide');
    return time.reduce(
      (acc: number, partition: number) => acc * partition,
      1000
    );
  }

  private makeChart(
    data_series: Array<
      [
        date_key: string,
        totalQuestions: number,
        timestamp: number,
        answered_correct: number,
        answered_wrong: number
      ]
    >,
    categories: string[]
  ): Chart {
    return new Chart({
      chart: {
        type: 'line',
      },
      title: {
        text: 'Past 7 days',
      },
      credits: {
        enabled: false,
      },
      xAxis: [
        {
          categories: categories,
        },
      ],
      tooltip: {
        shared: true,
      },
      plotOptions: {
        areaspline: {
          fillOpacity: 0.5,
        },
      },

      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 500,
            },
            chartOptions: {
              legend: {
                enabled: false,
              },
            },
          },
        ],
      },

      series: [
        {
          name: 'Random Questions',
          type: 'areaspline',
          data: data_series,
        },
        {
          name: 'Correctly Answered',
          type: 'areaspline',
          data: data_series.map((data) => data[CORRECT_ANSWERS_INDEX]),
        },
        {
          name: 'Wrongly Answered',
          type: 'areaspline',
          data: data_series.map((data) => data[WRONG_ANSWERS_INDEX]),
        },
      ],
    });
  }
}

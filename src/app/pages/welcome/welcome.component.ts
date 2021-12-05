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
import { Observable } from 'rxjs';
import { FormGroup, FormsModule } from '@angular/forms';


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
  created_at: String;
  marked_at: String;
}

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

  constructor(private firestore: AngularFirestore) {
    this.user = this.firestore.doc('users/t5T6rO3NCEbLJQZfj5st');
    this.words = this.user.collection<Word>('words').valueChanges();
    this.random_question = this.initializeRandomQuestion();
   
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
      marked_at: new Date().toISOString(),
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
      created_at: new Date().toISOString(),
      marked_at: '',
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

  // add point to chart serie
  add() {
    // this.chart.addPoint(Math.floor(Math.random() * 10));
  }
}

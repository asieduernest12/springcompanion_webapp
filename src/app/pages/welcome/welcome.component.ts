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


interface Meaning {
  meaning: String,
  sentences: String[]
}
interface Word {
  id: string;
  meanings: Meaning[];
  language: String;
  word: String;
}

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})

export class WelcomeComponent implements OnInit {

  words: Observable<any>;
  user: AngularFirestoreDocument<any>;
  selected_index: number | undefined;
  selected_word: Word | undefined;

  constructor(private firestore: AngularFirestore) {
    this.user = this.firestore.doc('users/t5T6rO3NCEbLJQZfj5st');
    this.words = this.user.collection('words').valueChanges();

    console.log(this.words);
  }

  ngOnInit() {}

  loadHistory() {}

  fetchHistory() {
    //use firebase
  }

  loadWord(word: Word, word_detailes_tab_index: number) {
    console.log( word);
    this.selected_word = word;
    this.selected_index = word_detailes_tab_index;
  }
}

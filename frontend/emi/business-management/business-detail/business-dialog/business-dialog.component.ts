import { Component, OnInit, Inject} from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

export interface DialogData {
  dialogTitle: string;
  dialogMessage: string;
}

@Component({
  selector: 'app-business-dialog.component',
  templateUrl: './business-dialog.component.html',
  styleUrls: ['./business-dialog.component.scss']
})
export class BusinessDialogComponent implements OnInit {

  constructor(private dialogRef: MatDialogRef<BusinessDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: DialogData) {

  }

  ngOnInit() {

  }

  pushButton(okButton: Boolean) {
    this.dialogRef.close(okButton);
  }

}

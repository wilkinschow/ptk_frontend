import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import moment from 'moment';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

enum MODE {
  ANALYZE = "Analyze",
  SCAN = "Scan"
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatSlideToggleModule, MatSnackBarModule ],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  forcedIsDeepFake: boolean = false;

  selectedFile: File | null = null;
  fileMetadata: string = '';
  uploadedFileId: string | null = null;
  isLoading: boolean = false;
  isScanned: boolean = false;
  isValidVideo: boolean | null = false;
  filePath: string = '';
  scanButtonText: string = MODE.SCAN;
  videoURL: string = '';
  videoDuration: number = 0; // Store video duration
  uuid: string = '';
  currTime: Date = new Date();
  defaultVideoDesc: string = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.';
  videoDesc: string = this.defaultVideoDesc;
  defaultSummary: string = 'Lorem ipsum dolor sit amet';
  summary: string = this.defaultSummary;
  addDesc: string = '';
  severity: string = '1';
  incidentType: string = 'Traffic';
  location: string = 'Tampines';
  loadingText: string = 'Loading';

  constructor(private snackBar: MatSnackBar) {}

  urlFile: File = new File([""], "Url Link", { type: "video/mp4" });

  generateUUID(): string {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
                      String(now.getMonth() + 1).padStart(2, '0') +
                      String(now.getDate()).padStart(2, '0') +
                      String(now.getHours()).padStart(2, '0') +
                      String(now.getMinutes()).padStart(2, '0') +
                      String(now.getSeconds()).padStart(2, '0');
    
    // Generate 4-character hexadecimal random suffix
    const randomSuffix = Math.floor(Math.random() * 65536)
      .toString(16)
      .toUpperCase()
      .padStart(4, '0');
    
    return timestamp + randomSuffix;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
  
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  }

  openSnackBar(msg: string='Upload successful!') {
    this.snackBar.open(msg, 'Close', {
      duration: 5000, // Auto close after 5 seconds
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }

  getDT(isTime: boolean){
    const dateTime = new Date();
    this.currTime = dateTime;
    return isTime ? 
     moment(dateTime).format("h:mm:ss A") :
     moment(dateTime).format("d MMMM y");
  }

  formatDT(format: string){
    return moment(this.currTime).format(format);
  }

  formatDuration(seconds: number): string {
    return moment.utc(seconds * 1000).format(seconds>3600?'HH:mm:ss':'mm:ss');  // Convert seconds to HH:mm:ss format
  }

  /**
   * Called when a file is selected from file input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.filePath = this.selectedFile.name; // Show file name in text box
      this.scanButtonText = MODE.SCAN; // Always Scan when uploading a file
      
      // Create a video element to get duration (using blob URL temporarily)
      const videoElement = document.createElement('video');
      const blobUrl = URL.createObjectURL(input.files[0]);
      videoElement.src = blobUrl;
      
      // Wait for the video metadata to load, then get the duration
      videoElement.onloadedmetadata = () => {
        this.videoDuration = videoElement.duration; // Set duration in seconds
        URL.revokeObjectURL(blobUrl); // Clean up the blob URL
      };
    }
    this.uuid = this.generateUUID();
  }

  async toggleLoading(): Promise<void> {
    this.isLoading = true; // Start loading
  
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isLoading = false; // Stop loading after 3 seconds
        resolve();
      }, 3000);
    });
  }
  

  /**
   * Triggered by clicking the upload icon
   */
  triggerFileSelection(): void {
    const fileInputElement = document.getElementById('hiddenFileInput') as HTMLInputElement;
    fileInputElement?.click();
  }

  /**
   * Handles URL input validation on change
   */
  onUrlInput(): void {
    if (this.isValidUrl(this.filePath)) {
      this.scanButtonText = MODE.ANALYZE;
      this.selectedFile = null; // No file selected if URL provided
    } else {
      this.scanButtonText = MODE.SCAN;
    }
  }

  /**
   * Simple URL validation function
   */
  isValidUrl(url: string): boolean {
    const urlPattern = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
    return urlPattern.test(url);
  }

  async scanVideo(): Promise<void> {
    this.isLoading = true;
    this.isValidVideo = true; // Assume valid URL unless told otherwise

    this.loadingText = 'Checking for deepfake artifacts'
    console.log(this.loadingText);

    //STEP 1-A: Scan and upload video to backend to get uuid. #################################################################################################
    if(this.scanButtonText == MODE.SCAN)
    {
      const formData = new FormData();
      formData.append('post_file', this.selectedFile!);
      console.log("Analyzing input file: "+this.selectedFile);
      try {
        const response = await fetch("/api/upload/", {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.deepfake) this.isValidVideo = !data.deepfake;
        if (data.media_uuid) this.uploadedFileId = data.media_uuid;
      } catch (error) {
        console.error('Something failed', error);
      }
    }
    //STEP 1-B: Analyze video url. #################################################################################################
    else if(this.scanButtonText == MODE.ANALYZE)
    {
      console.log("Analyzing url: "+this.filePath);
      this.uuid = this.generateUUID();
      this.selectedFile = new File([""], this.filePath, { type: "video/mp4" });

      try {
        const response = await fetch(`/api/uploadurl?url=${this.filePath}`, {
          method: 'POST',
        });

        const data = await response.json();
        if (data.deepfake) this.isValidVideo = !data.deepfake;
        if (data.media_uuid) this.uploadedFileId = data.media_uuid;
      } catch (error) {
        console.error('Something failed', error);
      }
    }

    console.log("upload to backend complete. media_uuid: "+this.uploadedFileId);
    
    // Set video URL to backend_vlm endpoint for both SCAN and ANALYZE modes
    if (this.uploadedFileId) {
      this.videoURL = `/api/video/${this.uploadedFileId}`;
    }
    
    this.loadingText = this.isValidVideo ? 'Generating video description' : 'Deepfake artifacts detected!'
    console.log(this.loadingText);

    //STEP 2: upload to backend to get uuid. #################################################################################################
    if(this.isValidVideo){
      try {
        const response = await fetch(`/api/predict/${this.uploadedFileId}`, {
          method: 'POST',
        });
  
        const data = await response.json();
        if (data) {
          this.summary = data.shortsummary;
          this.videoDesc = data.summary;
          this.isValidVideo = !data.deepfake;
          this.incidentType = data.incidentType;
          this.location = data.location;
          this.severity = data.severity;
          this.openSnackBar('Scan completed!');
        } else {
          this.openSnackBar('Scan failed!');
        }
      } catch (error) {
        console.error('Predict timed out, attempting to retrieve via query method.', error);
        //second try to try and retrieve video description via query
        // Retry loop
        let maxAttempts = 10;
        let attempts = 0;
        let queryResult = "";

        while (attempts < maxAttempts && queryResult !== "Failed") {
          try {
            const queryResponse = await fetch(`/api/query/${this.uploadedFileId}`, {
              method: 'GET',
            });

            const queryData = await queryResponse.json();
            queryResult = queryData.status;

            if (queryData.status === 'Completed') {
              this.summary = queryData.shortsummary;
              this.videoDesc = queryData.summary;
              this.isValidVideo = !queryData.deepfake;
              this.incidentType = queryData.incidentType;
              this.location = queryData.location;
              this.severity = queryData.severity;
              this.openSnackBar('Scan completed!');
              break; // Exit loop
            } else {
              console.log(`Status: ${queryData.status}. Retrying...`);
            }
          } catch (queryError) {
            console.error('Query fetch error:', queryError);
          }
          // Wait 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }

        if (attempts === maxAttempts) {
          this.openSnackBar('Scan failed after multiple retries.');
        }
      }
    }

    this.isLoading = false;
    this.isScanned = true;
    this.loadingText = 'Loading';
  }

  /**
   * Upload button click handler
   */
  // async uploadVideo(): Promise<void> {
  //   this.fileMetadata = 
  //     `
  //       uuid: ${this.uuid}\n
  //       media_uuid: ${this.uploadedFileId}\n
  //       Size: ${(this.formatBytes(this.selectedFile!.size))}\n
  //       Video Duration: ${this.formatDuration(this.videoDuration)}\n
  //       Submission Date: ${this.formatDT('D MMMM YYYY, h:mm A')}\n
  //       isValidVideo: ${this.isValidVideo}\n
  //       videoDesc: ${this.videoDesc}\n
  //       addDesc: ${this.addDesc}\n
  //     `;

  //   const formData = new FormData();
  //   formData.append('video', this.videoURL);
  //   formData.append('metadata', this.fileMetadata);

  //   try {
  //     const response = await fetch('http://localhost:3000/upload', {
  //       method: 'POST',
  //       body: formData,
  //     });

  //     const data = await response.json();
  //     if (data.videoId) {
  //       this.uploadedFileId = data.videoId;
  //       this.getMetadata();
  //     }

  //     await this.toggleLoading();

  //     this.openSnackBar();
  //     this.cancelSelection();
  //   } catch (error) {
  //     console.error('Upload failed', error);
  //   }
  // }

  async uploadVideo(): Promise<void> {
    const payload = {
      uuid: this.uuid,
      media_uuid: this.uploadedFileId,
      name: this.selectedFile!.name,
      size: this.formatBytes(this.selectedFile!.size),
      videoURL: this.isValidUrl(this.filePath) ? this.filePath : "",
      videoDuration: this.formatDuration(this.videoDuration),
      submissionDate: this.formatDT('D MMMM YYYY, h:mm A'),
      isValidVideo: this.isValidVideo,
      videoDesc: this.videoDesc,
      addDesc: this.addDesc,
      incidentType: this.incidentType,
      severity: this.severity,
      location: this.location,
      summary: this.summary

    };

    try {
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.videoId) {
        this.uploadedFileId = data.videoId;
        this.getMetadata();
      }

      await this.toggleLoading();

      this.openSnackBar();
      this.cancelSelection();

    } catch (error) {
      console.error('Upload failed', error);
    }
  }

  /**
   * Fetch metadata after upload using uploadedFileId
   */
  async getMetadata(): Promise<void> {
    if (!this.uploadedFileId) return;

    try {
      const response = await fetch(`http://localhost:3000/videos/${this.uploadedFileId}`);
      const data = await response.json();
      this.fileMetadata = data.metadata || 'No metadata available';
    } catch (error) {
      console.error('Failed to fetch metadata', error);
    }
  }

  /**
   * Resets all selection and state (called after cancel or upload)
   */
  cancelSelection(): void {
    this.selectedFile = null;
    this.fileMetadata = '';
    this.uploadedFileId = null;
    this.isValidVideo = null;
    this.filePath = '';
    this.scanButtonText = MODE.SCAN;
    this.uuid = '';
    this.videoDesc= this.defaultVideoDesc;
    this.addDesc = '';
    this.videoURL = ""

    this.isScanned = false;

    // Reset hidden file input (optional)
    const fileInputElement = document.getElementById('hiddenFileInput') as HTMLInputElement;
    if (fileInputElement) fileInputElement.value = '';
  }
}
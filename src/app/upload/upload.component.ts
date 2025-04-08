import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import moment from 'moment';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
  videoLink? : SafeResourceUrl;
  videoDuration: number = 0; // Store video duration
  uuid: string = '';
  currTime: Date = new Date();
  defaultVideoDesc: string = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.';
  videoDesc: string = this.defaultVideoDesc;
  addDesc: string = '';
  loadingText: string = 'loading';
  hasEmbed: boolean = true;

  constructor(private snackBar: MatSnackBar, private sanitizer: DomSanitizer) {}

  urlFile: File = new File([""], "Url Link", { type: "video/mp4" });

  generateUUID(): string {
    return crypto.randomUUID();
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
     moment(dateTime).format("hh:mm A") :
     moment(dateTime).format("DD/MM/YYYY");
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
      this.videoURL = URL.createObjectURL(input.files[0]);
      // Create a video element to get duration
      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(input.files[0]);
      
      // Wait for the video metadata to load, then get the duration
      videoElement.onloadedmetadata = () => {
        this.videoDuration = videoElement.duration; // Set duration in seconds
      };
      this.selectedFile = input.files[0];
      this.filePath = this.selectedFile.name; // Show file name in text box
      this.scanButtonText = MODE.SCAN; // Always Scan when uploading a file
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

  extractYouTubeVideoId(url: string): string {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : "";
  }
  
  async fetchYouTubeMetadata(videoId: string) {
    const cleanWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    this.videoLink = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanWatchUrl)}&format=json`;
    
    const response = await fetch(oembed);
    if (!response.ok) throw new Error('Invalid YouTube video or network error');
    return await response.json();
  }

  /**
   * Handles URL input validation on change
   */
  onUrlInput(): void {
    if (this.isValidUrl(this.filePath)) {
      this.scanButtonText = MODE.ANALYZE;
      this.selectedFile = null; // No file selected if URL provided
      this.isValidVideo = true; // Assume valid URL unless told otherwise
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
      const videoId = this.extractYouTubeVideoId(this.filePath);
      if (videoId == "") {
        this.selectedFile = new File([""], this.filePath, { type: "video/mp4" });
        this.hasEmbed = false;
      }
      else{
        const metadata = await this.fetchYouTubeMetadata(videoId);
        this.selectedFile = new File([""], metadata.title, { type: "video/mp4" });
      }

      try {
        const response = await fetch(`/api/uploadurl?url=${this.filePath}`, {
          method: 'POST',
        });

        const data = await response.json();
        if (data.media_uuid) this.uploadedFileId = data.media_uuid;
      } catch (error) {
        console.error('Something failed', error);
      }
    }

    console.log("upload to backend complete. media_uuid: "+this.uploadedFileId);
    this.loadingText = 'Generating video description'
    console.log(this.loadingText);

    //STEP 2: upload to backend to get uuid. #################################################################################################
    try {
      const response = await fetch(`/api/predict/${this.uploadedFileId}`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data) {
        this.videoDesc = data.summary;
        this.isValidVideo = !data.deepfake;
        this.openSnackBar('Scan completed!');
      } else {
        this.openSnackBar('Scan failed!');
      }
    } catch (error) {
      console.error('Something failed', error);
    }

    this.isLoading = false;
    this.isValidVideo = !(this.forcedIsDeepFake);
    this.isScanned = true;
    this.loadingText = 'loading'
  }

  /**
   * Upload button click handler
   */
  async uploadVideo(): Promise<void> {
    this.fileMetadata = 
      `
        uuid: ${this.uuid}\n
        media_uuid: ${this.uploadedFileId}\n
        Size: ${(this.formatBytes(this.selectedFile!.size))}\n
        Video Duration: ${this.formatDuration(this.videoDuration)}\n
        Submission Date: ${this.formatDT('D MMMM YYYY, h:mm A')}\n
        isValidVideo: ${this.isValidVideo}\n
        videoDesc: ${this.videoDesc}\n
        addDesc: ${this.addDesc}\n
      `;

    const formData = new FormData();
    formData.append('video', this.videoURL);
    formData.append('metadata', this.fileMetadata);

    try {
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
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
    this.videoLink = undefined;
    this.hasEmbed = true;

    this.isScanned = false;

    // Reset the hidden file input (optional)
    const fileInputElement = document.getElementById('hiddenFileInput') as HTMLInputElement;
    if (fileInputElement) fileInputElement.value = '';
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import moment from 'moment';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatSlideToggleModule],
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
  scanButtonText: string = 'Scan';
  videoURL: string = '';
  videoDuration: number = 0; // Store video duration
  uuid: string = '';
  currTime: Date = new Date();
  defaultVideoDesc: string = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.';
  videoDesc: string = this.defaultVideoDesc;
  addDesc: string = '';

  generateUUID(): string {
    return crypto.randomUUID();
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
  
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
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
      this.scanButtonText = 'Scan'; // Always Scan when uploading a file
    }
    this.uuid = this.generateUUID();
  }

  async toggleLoading() {
    this.isLoading = true; // Set to true when starting loading
  
    setTimeout(() => {
      this.isLoading = false; // Set to false after 3 seconds
    }, 3000); // 3000 ms = 3 seconds
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
      this.scanButtonText = 'Analyze';
      this.selectedFile = null; // No file selected if URL provided
      this.isValidVideo = true; // Assume valid URL unless told otherwise
    } else {
      this.scanButtonText = 'Scan';
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
    await this.toggleLoading();

    this.isValidVideo = !(this.forcedIsDeepFake);
    this.isScanned = true;
  }

  /**
   * Upload button click handler
   */
  async uploadVideo(): Promise<void> {
    if (this.isValidUrl(this.filePath)) {
      console.log('Analyzing URL:', this.filePath);
      // Add logic to POST URL and process the response here
      alert(`Analyzing video at URL: ${this.filePath}`);
      return;
    }

    if (!this.selectedFile) {
      alert('Invalid video! Cannot upload.');
      return;
    }

    this.fileMetadata = 
      `
        uuid: ${this.uuid}\n
        Size: ${(this.formatBytes(this.selectedFile!.size))}\n
        Video Duration: ${this.formatDuration(this.videoDuration)}\n
        Submission Date: ${this.formatDT('D MMMM YYYY, h:mm A')}\n
        isValidVideo: ${this.isValidVideo}\n
        videoDesc: ${this.videoDesc}\n
        addDesc: ${this.addDesc}\n
      `;

    const formData = new FormData();
    formData.append('video', this.selectedFile);
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

      alert('Upload successful!');
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
    this.scanButtonText = 'Scan';
    this.uuid = '';
    this.videoDesc= this.defaultVideoDesc;
    this.addDesc = '';

    this.isScanned = false;

    // Reset the hidden file input (optional)
    const fileInputElement = document.getElementById('hiddenFileInput') as HTMLInputElement;
    if (fileInputElement) fileInputElement.value = '';
  }
}

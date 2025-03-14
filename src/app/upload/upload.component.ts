import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  selectedFile: File | null = null;
  fileMetadata: string = '';
  uploadedFileId: string | null = null;
  isValidVideo: boolean | null = null; // Will store true (valid) or false (deepfake)
  randRoll: number | null = null; // Store the random roll value

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];

      // Roll a number between 0 and 100
      this.randRoll = Math.floor(Math.random() * 101);

      // Simulate validation: If the number is below 50, it's a deepfake
      this.isValidVideo = this.randRoll >= 50; // If < 50, it's deepfake

      if (this.isValidVideo) {
        // Generate initial metadata only if the video is valid
        this.fileMetadata = `Name: ${this.selectedFile.name}\nSize: ${(this.selectedFile.size / 1024 / 1024).toFixed(2)} MB\nType: ${this.selectedFile.type}`;
      } else {
        // If deepfake, clear metadata
        this.fileMetadata = '';
      }
    }
  }

  async uploadVideo(fileInput: HTMLInputElement) {
    if (!this.selectedFile || !this.isValidVideo) {
      alert('Invalid video! Cannot upload.');
      return;
    }

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
      fileInput.value = ''; // Reset file input
    } catch (error) {
      console.error('Upload failed', error);
    }
  }

  async getMetadata() {
    if (!this.uploadedFileId) return;

    try {
      const response = await fetch(`http://localhost:3000/videos/${this.uploadedFileId}`);
      const data = await response.json();
      this.fileMetadata = data.metadata || 'No metadata available';
    } catch (error) {
      console.error('Failed to fetch metadata', error);
    }
  }

  cancelSelection(fileInput: HTMLInputElement) {
    this.selectedFile = null;
    this.fileMetadata = '';
    this.uploadedFileId = null;
    this.isValidVideo = null;
    this.randRoll = null;
    fileInput.value = '';
  }
}

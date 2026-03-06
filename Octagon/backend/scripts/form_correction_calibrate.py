"""
Form Correction Calibration Script
===================================

This Python script demonstrates how to use OpenCV + MediaPipe to:
1. Process a reference video of correct technique
2. Extract pose landmarks (33 body points)
3. Calculate joint angles per frame
4. Generate "ideal" angle templates for each MMA technique

Usage:
  pip install opencv-python mediapipe numpy
  python form_correction_calibrate.py --video reference_jab.mp4 --technique jab-cross

The output is a JSON file of ideal angle ranges that can be used
to update the frontend technique templates in poseAnalysis.ts.

How the model works:
-------------------
1. MediaPipe Pose detects 33 body landmarks from each video frame
   (shoulders, elbows, wrists, hips, knees, ankles, etc.)

2. Joint angles are calculated using trigonometry:
   angle = atan2(C.y - B.y, C.x - B.x) - atan2(A.y - B.y, A.x - B.x)
   where B is the vertex (joint), A and C are the connected points

3. For each technique, we define "ideal" angle ranges by processing
   reference videos of correct form (this script)

4. During analysis, the user's angles are compared to ideal ranges:
   - Within range = 100 score
   - Outside range = score decreases ~2.5 points per degree of deviation

5. Scores are weighted by importance (e.g., punch extension > knee bend)
   and averaged across frames
"""

import cv2
import mediapipe as mp
import numpy as np
import json
import argparse
from pathlib import Path

# MediaPipe Pose setup
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

# Landmark indices
LANDMARKS = {
    'NOSE': 0,
    'LEFT_SHOULDER': 11, 'RIGHT_SHOULDER': 12,
    'LEFT_ELBOW': 13, 'RIGHT_ELBOW': 14,
    'LEFT_WRIST': 15, 'RIGHT_WRIST': 16,
    'LEFT_HIP': 23, 'RIGHT_HIP': 24,
    'LEFT_KNEE': 25, 'RIGHT_KNEE': 26,
    'LEFT_ANKLE': 27, 'RIGHT_ANKLE': 28,
}


def calculate_angle(a, b, c):
    """Calculate angle at vertex B formed by points A-B-C (in degrees)."""
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0:
        angle = 360.0 - angle
    return round(angle, 1)


def get_landmark_coords(landmarks, idx):
    """Get (x, y) coordinates for a landmark."""
    lm = landmarks.landmark[idx]
    return [lm.x, lm.y]


def calculate_all_angles(landmarks):
    """Calculate all relevant joint angles from pose landmarks."""
    lm = lambda idx: get_landmark_coords(landmarks, idx)

    angles = {
        'left_elbow': calculate_angle(lm(11), lm(13), lm(15)),
        'right_elbow': calculate_angle(lm(12), lm(14), lm(16)),
        'left_shoulder': calculate_angle(lm(23), lm(11), lm(13)),
        'right_shoulder': calculate_angle(lm(24), lm(12), lm(14)),
        'left_hip': calculate_angle(lm(11), lm(23), lm(25)),
        'right_hip': calculate_angle(lm(12), lm(24), lm(26)),
        'left_knee': calculate_angle(lm(23), lm(25), lm(27)),
        'right_knee': calculate_angle(lm(24), lm(26), lm(28)),
    }

    # Hip rotation (shoulder-hip alignment difference)
    shoulder_dx = abs(landmarks.landmark[11].x - landmarks.landmark[12].x)
    hip_dx = abs(landmarks.landmark[23].x - landmarks.landmark[24].x)
    angles['hip_rotation'] = round(abs(shoulder_dx - hip_dx) * 180, 1)

    return angles


def process_video(video_path, show_preview=True):
    """
    Process a video and extract pose angles per frame.

    Args:
        video_path: Path to the video file
        show_preview: Whether to show real-time preview with skeleton overlay

    Returns:
        List of angle dictionaries (one per frame where pose was detected)
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video {video_path}")
        return []

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0

    print(f"Video: {video_path}")
    print(f"FPS: {fps:.1f}, Frames: {total_frames}, Duration: {duration:.1f}s")

    all_angles = []
    frame_count = 0

    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as pose:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            # Process every 5th frame for efficiency
            if frame_count % 5 != 0:
                continue

            # Convert BGR to RGB for MediaPipe
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb)

            if results.pose_landmarks:
                angles = calculate_all_angles(results.pose_landmarks)
                angles['frame'] = frame_count
                angles['timestamp'] = round(frame_count / fps, 2)
                all_angles.append(angles)

                if show_preview:
                    # Draw skeleton overlay
                    mp_drawing.draw_landmarks(
                        frame,
                        results.pose_landmarks,
                        mp_pose.POSE_CONNECTIONS,
                        mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=3),
                        mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2)
                    )

                    # Display angles on frame
                    y_pos = 30
                    for name, value in angles.items():
                        if name in ('frame', 'timestamp'):
                            continue
                        cv2.putText(frame, f"{name}: {value}", (10, y_pos),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                        y_pos += 20

            if show_preview:
                cv2.imshow('Form Correction Calibration', frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break

    cap.release()
    if show_preview:
        cv2.destroyAllWindows()

    print(f"\nProcessed {len(all_angles)} frames with pose detection")
    return all_angles


def generate_template(all_angles, technique_name, margin=15):
    """
    Generate ideal angle ranges from reference video data.

    Args:
        all_angles: List of angle dictionaries from process_video()
        technique_name: Name of the technique (e.g., 'jab-cross')
        margin: Degrees of margin around the mean for ideal range

    Returns:
        Dictionary of angle ranges suitable for the scoring system
    """
    if not all_angles:
        print("No angle data to generate template from!")
        return {}

    angle_names = [k for k in all_angles[0].keys() if k not in ('frame', 'timestamp')]

    template = {
        'technique': technique_name,
        'frames_analyzed': len(all_angles),
        'angles': {}
    }

    print(f"\n{'='*50}")
    print(f"Template for: {technique_name}")
    print(f"{'='*50}")

    for name in angle_names:
        values = [a[name] for a in all_angles if name in a]
        if not values:
            continue

        mean = np.mean(values)
        std = np.std(values)
        min_val = max(0, round(mean - margin, 0))
        max_val = min(180, round(mean + margin, 0))

        template['angles'][name] = {
            'min': int(min_val),
            'max': int(max_val),
            'mean': round(mean, 1),
            'std': round(std, 1),
            'weight': 1.0,  # Adjust manually based on importance
        }

        print(f"  {name:20s}: mean={mean:6.1f}  std={std:5.1f}  range=[{min_val:.0f}, {max_val:.0f}]")

    return template


def save_template(template, output_path):
    """Save template to JSON file."""
    with open(output_path, 'w') as f:
        json.dump(template, f, indent=2)
    print(f"\nTemplate saved to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description='MMA Form Correction Calibration Tool')
    parser.add_argument('--video', type=str, required=True, help='Path to reference video')
    parser.add_argument('--technique', type=str, default='jab-cross',
                       choices=['jab-cross', 'hook', 'kick', 'defense'],
                       help='Technique type')
    parser.add_argument('--output', type=str, default=None, help='Output JSON path')
    parser.add_argument('--margin', type=int, default=15, help='Angle margin in degrees')
    parser.add_argument('--no-preview', action='store_true', help='Disable video preview')

    args = parser.parse_args()

    if not Path(args.video).exists():
        print(f"Error: Video file not found: {args.video}")
        return

    # Process video
    all_angles = process_video(args.video, show_preview=not args.no_preview)

    if not all_angles:
        print("No poses detected in video. Ensure the full body is visible.")
        return

    # Generate template
    template = generate_template(all_angles, args.technique, margin=args.margin)

    # Save
    output_path = args.output or f"template_{args.technique}.json"
    save_template(template, output_path)

    print("\n" + "="*50)
    print("HOW TO USE THIS TEMPLATE:")
    print("="*50)
    print(f"1. Review the generated ranges in {output_path}")
    print("2. Adjust 'weight' values (higher = more important for scoring)")
    print("3. Copy the angle ranges into frontend/lib/poseAnalysis.ts")
    print("   under the corresponding technique template")
    print("4. Map 'left_elbow' -> 'leadElbow', 'right_elbow' -> 'rearElbow'")
    print("   (assuming orthodox stance; swap for southpaw)")


if __name__ == '__main__':
    main()

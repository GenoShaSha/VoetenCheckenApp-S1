# C4 Diagram - VoetenChecken App

This document describes the architecture of the VoetenChecken (Foot Check) application using the C4 model.

---

## Level 1: System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM CONTEXT                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │    User     │
                                    │  (Patient/  │
                                    │  Caregiver) │
                                    └──────┬──────┘
                                           │
                                           │ Takes foot photos
                                           │ Views analysis results
                                           ▼
                              ┌────────────────────────┐
                              │                        │
                              │   VoetenChecken App    │
                              │                        │
                              │  [Software System]     │
                              │                        │
                              │  Analyzes foot images  │
                              │  for quality and       │
                              │  condition assessment  │
                              │                        │
                              └────────────────────────┘
```

**Description:**
- **User (Patient/Caregiver)**: Takes photos of feet using the mobile app to get automated quality feedback and condition analysis.
- **VoetenChecken App**: A mobile application that captures foot images, validates image quality, and provides ML-powered condition classification.

---

## Level 2: Container Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CONTAINER DIAGRAM                               │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │    User     │
                                    └──────┬──────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           VoetenChecken System                                │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│                                                                              │
│  │  ┌────────────────────────┐         ┌────────────────────────┐       │   │
│     │                        │  HTTP   │                        │           │
│  │  │  React Native Mobile   │  POST   │    Python Flask        │       │   │
│     │       App              │────────▶│       Backend          │           │
│  │  │                        │ /predict│                        │       │   │
│     │  [Container: Mobile]   │         │  [Container: Server]   │           │
│  │  │                        │◀────────│                        │       │   │
│     │  - TypeScript          │  JSON   │  - Python 3.10+        │           │
│  │  │  - React Native 0.82   │ Response│  - Flask               │       │   │
│     │  - Vision Camera       │         │  - TensorFlow/Keras    │           │
│  │  │  - TTS                 │         │  - OpenCV              │       │   │
│     │                        │         │                        │           │
│  │  └────────────────────────┘         └───────────┬────────────┘       │   │
│                                                     │                       │
│  │                                                  │ Saves                │   │
│                                                     ▼                       │
│  │                                        ┌─────────────────┐            │   │
│                                           │   Local File    │               │
│  │                                        │    Storage      │            │   │
│                                           │                 │               │
│  │                                        │ [Container:     │            │   │
│                                           │  File System]   │               │
│  │                                        │                 │            │   │
│                                           │ - Images (.jpg) │               │
│  │                                        │ - Predictions   │            │   │
│                                           │   (.json)       │               │
│  │                                        └─────────────────┘            │   │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                                                              │
│  Mobile Device Local Storage:                                                │
│  ┌─────────────────────────┐                                                 │
│  │    AsyncStorage         │                                                 │
│  │  - Prediction History   │                                                 │
│  │  - First Launch Flag    │                                                 │
│  └─────────────────────────┘                                                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Container Descriptions:

| Container | Technology | Purpose |
|-----------|------------|---------|
| **React Native Mobile App** | TypeScript, React Native 0.82, Vision Camera | User interface for capturing images, displaying results, onboarding |
| **Python Flask Backend** | Python 3.10, Flask, TensorFlow, OpenCV | ML inference for IQA and condition classification |
| **Local File Storage** | File System | Persists images and prediction JSON for review |
| **AsyncStorage** | React Native AsyncStorage | Stores prediction history and app state on device |

---

## Level 3: Component Diagram

### 3.1 React Native Mobile App Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REACT NATIVE MOBILE APP - COMPONENTS                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              Mobile App Container                             │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         SCREENS (UI Layer)                           │   │
│   │                                                                      │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│   │  │Instructions │  │ ImageInput  │  │ Augmented   │  │  Quality   │  │   │
│   │  │   Screen    │  │   Screen    │  │   Camera    │  │  Review    │  │   │
│   │  │             │  │             │  │   Screen    │  │  Screen    │  │   │
│   │  │ [Onboarding]│  │ [Home +     │  │             │  │            │  │   │
│   │  │  6 pages    │  │  History]   │  │ [Live       │  │ [Bad image │  │   │
│   │  │             │  │             │  │  quality    │  │  feedback] │  │   │
│   │  │             │  │             │  │  indicators]│  │            │  │   │
│   │  └─────────────┘  └──────┬──────┘  └──────┬──────┘  └────────────┘  │   │
│   │                          │                │                          │   │
│   │                          │                │                          │   │
│   │  ┌─────────────┐         │                │                          │   │
│   │  │ Condition   │◀────────┴────────────────┘                          │   │
│   │  │  Result     │                                                     │   │
│   │  │  Screen     │                                                     │   │
│   │  │             │                                                     │   │
│   │  │ [Success    │                                                     │   │
│   │  │  display]   │                                                     │   │
│   │  └─────────────┘                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       SERVICES (Logic Layer)                         │   │
│   │                                                                      │   │
│   │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │   │
│   │  │ analysisPipeline │  │  historyStorage  │  │    modelLoader   │   │   │
│   │  │                  │  │                  │  │                  │   │   │
│   │  │ - Sends image to │  │ - Load history   │  │ - Initialize     │   │   │
│   │  │   backend        │  │ - Save prediction│  │   TensorFlow.js  │   │   │
│   │  │ - Process IQA    │  │ - Clear history  │  │ - Load label     │   │   │
│   │  │   results        │  │ - Format dates   │  │   mappings       │   │   │
│   │  │ - Route to       │  │                  │  │                  │   │   │
│   │  │   screens        │  │                  │  │                  │   │   │
│   │  └────────┬─────────┘  └──────────────────┘  └──────────────────┘   │   │
│   │           │                                                          │   │
│   └───────────┼──────────────────────────────────────────────────────────┘   │
│               │                                                              │
│               │ HTTP POST /predict                                           │
│               ▼                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    EXTERNAL DEPENDENCIES                             │   │
│   │                                                                      │   │
│   │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│   │  │  Vision    │  │  React     │  │   React    │  │    TTS     │    │   │
│   │  │  Camera    │  │ Navigation │  │   Native   │  │ (Text-to-  │    │   │
│   │  │            │  │            │  │   FS       │  │  Speech)   │    │   │
│   │  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Python Backend Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PYTHON FLASK BACKEND - COMPONENTS                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                            Backend Container                                  │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          API LAYER                                   │   │
│   │                                                                      │   │
│   │  ┌─────────────────────────────────────────────────────────────┐    │   │
│   │  │                    Flask App                                 │    │   │
│   │  │                                                              │    │   │
│   │  │   POST /predict                                              │    │   │
│   │  │   ├── Receives base64 image                                  │    │   │
│   │  │   ├── Returns IQA scores, condition scores, OpenCV metrics   │    │   │
│   │  │   └── Saves prediction to disk                               │    │   │
│   │  │                                                              │    │   │
│   │  └─────────────────────────────────────────────────────────────┘    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       ML INFERENCE LAYER                             │   │
│   │                                                                      │   │
│   │  ┌──────────────────────┐     ┌──────────────────────┐              │   │
│   │  │   IQA Model          │     │  Condition Model     │              │   │
│   │  │                      │     │                      │              │   │
│   │  │ - EfficientNetB3     │     │ - EfficientNetB3     │              │   │
│   │  │ - Input: 224x224     │     │ - Input: 300x300     │              │   │
│   │  │ - Classes:           │     │ - Classes:           │              │   │
│   │  │   • Good foot        │     │   • Various foot     │              │   │
│   │  │   • Blurry           │     │     conditions       │              │   │
│   │  │   • Too dark         │     │                      │              │   │
│   │  │   • Too bright       │     │                      │              │   │
│   │  │   • Bad angle        │     │                      │              │   │
│   │  │   • Not a foot       │     │                      │              │   │
│   │  └──────────────────────┘     └──────────────────────┘              │   │
│   │                                                                      │   │
│   │  ┌──────────────────────────────────────────────────────────────┐   │   │
│   │  │                    OpenCV Metrics                             │   │   │
│   │  │                                                               │   │   │
│   │  │  - Sharpness (Laplacian variance)                            │   │   │
│   │  │  - Contrast (Standard deviation)                              │   │   │
│   │  │  - Brightness (Mean pixel value)                              │   │   │
│   │  │  - Noise Variance                                             │   │   │
│   │  │  - Blockiness Score                                           │   │   │
│   │  └──────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      DATA PERSISTENCE LAYER                          │   │
│   │                                                                      │   │
│   │  ┌──────────────────────────────────────────────────────────────┐   │   │
│   │  │              save_prediction_data()                           │   │   │
│   │  │                                                               │   │   │
│   │  │  Saves to: PythonServer/data/{timestamp}/                    │   │   │
│   │  │  ├── image.jpg                                                │   │   │
│   │  │  └── prediction.json                                          │   │   │
│   │  │      ├── iqa_predictions                                      │   │   │
│   │  │      ├── condition_predictions                                │   │   │
│   │  │      └── opencv_metrics                                       │   │   │
│   │  └──────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Level 4: Code Diagram (Key Classes/Functions)

### 4.1 Analysis Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ANALYSIS PIPELINE FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

User captures/selects image
         │
         ▼
┌─────────────────────┐
│ ImageInputScreen    │
│ or                  │
│ AugmentedCamera     │
│                     │
│ • Validate JPG      │
│ • Convert to base64 │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│ runAnalysisPipeline │────────▶│  Python Backend     │
│                     │  POST   │                     │
│ analysisPipeline.ts │/predict │  python_server.py   │
└──────────┬──────────┘         └──────────┬──────────┘
           │                               │
           │                    ┌──────────┴──────────┐
           │                    │                     │
           │                    ▼                     ▼
           │         ┌─────────────────┐   ┌─────────────────┐
           │         │  IQA Model      │   │ Condition Model │
           │         │  (224x224)      │   │   (300x300)     │
           │         └────────┬────────┘   └────────┬────────┘
           │                  │                     │
           │                  └──────────┬──────────┘
           │                             │
           │                             ▼
           │                  ┌─────────────────────┐
           │                  │  OpenCV Metrics     │
           │◀─────────────────│  + Combined JSON    │
           │    JSON Response │  Response           │
           │                  └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Decision Logic      │
│                     │
│ IF top IQA label    │
│ is "Good foot"      │
│ AND OpenCV metrics  │
│ pass thresholds     │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐  ┌──────────────┐
│ Quality │  │  Condition   │
│ Review  │  │   Result     │
│ Screen  │  │   Screen     │
│         │  │              │
│ (Retry) │  │  (Success)   │
└─────────┘  └──────────────┘
```

### 4.2 Screen Navigation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NAVIGATION FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

                    App Launch
                        │
                        ▼
                ┌───────────────┐
                │ First Launch? │
                └───────┬───────┘
                        │
            ┌───────────┴───────────┐
            │ YES                   │ NO
            ▼                       ▼
    ┌───────────────┐       ┌───────────────┐
    │ Instructions  │       │  ImageInput   │◀──────────────────┐
    │   Screen      │       │    Screen     │                   │
    │               │       │               │                   │
    │ 6 swipeable   │       │ • Gallery     │                   │
    │ pages         │       │ • Camera      │                   │
    │               │       │ • History     │                   │
    └───────┬───────┘       └───────┬───────┘                   │
            │                       │                           │
            │ "Get Started"         │                           │
            └───────────────────────┤                           │
                                    │                           │
                    ┌───────────────┴───────────────┐           │
                    │                               │           │
                    ▼                               ▼           │
            ┌───────────────┐               ┌───────────────┐   │
            │   Gallery     │               │  Augmented    │   │
            │   Picker      │               │    Camera     │   │
            │               │               │               │   │
            │ JPG only      │               │ Live quality  │   │
            │               │               │ indicators    │   │
            └───────┬───────┘               └───────┬───────┘   │
                    │                               │           │
                    └───────────────┬───────────────┘           │
                                    │                           │
                                    ▼                           │
                            ┌───────────────┐                   │
                            │   Analysis    │                   │
                            │   Pipeline    │                   │
                            └───────┬───────┘                   │
                                    │                           │
                    ┌───────────────┴───────────────┐           │
                    │ FAIL                          │ PASS      │
                    ▼                               ▼           │
            ┌───────────────┐               ┌───────────────┐   │
            │   Quality     │               │  Condition    │   │
            │   Review      │               │   Result      │   │
            │               │               │               │   │
            │ Tips to       │               │ Detected      │   │
            │ improve       │               │ condition     │   │
            └───────┬───────┘               └───────┬───────┘   │
                    │                               │           │
                    │ "Take New Photo"              │ "Submit"  │
                    └───────────────────────────────┴───────────┘
```

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA FLOW                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Camera/   │     │   Mobile    │     │   Python    │     │   File      │
│   Gallery   │────▶│     App     │────▶│   Backend   │────▶│   Storage   │
│             │     │             │     │             │     │             │
│  JPG Image  │     │  Base64     │     │  ML Models  │     │  data/      │
│             │     │  Encoding   │     │  OpenCV     │     │  └─{id}/    │
│             │     │             │     │             │     │    ├─img    │
│             │     │             │     │             │     │    └─json   │
└─────────────┘     └──────┬──────┘     └──────┬──────┘     └─────────────┘
                           │                   │
                           │◀──────────────────┘
                           │   JSON Response:
                           │   • iqaScores[]
                           │   • conditionScores[]
                           │   • opencvMetrics{}
                           │
                           ▼
                    ┌─────────────┐
                    │ AsyncStorage│
                    │             │
                    │ History     │
                    │ Records     │
                    └─────────────┘
```

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| **Mobile Frontend** | React Native | 0.82.1 |
| | TypeScript | - |
| | React Navigation | 7.x |
| | Vision Camera | 4.7.3 |
| | React Native TTS | 4.1.1 |
| | AsyncStorage | 2.2.0 |
| **Backend Server** | Python | 3.10+ |
| | Flask | Latest |
| | TensorFlow/Keras | Latest |
| | OpenCV | Latest |
| **ML Models** | EfficientNetB3 | - |
| | IQA Model | 224x224 input |
| | Condition Model | 300x300 input |
| **Communication** | HTTP REST | JSON |
| **Storage** | File System | JPG + JSON |
| | AsyncStorage | Key-Value |

---

## Key Design Decisions

1. **Local Backend**: Server runs on localhost for development; can be deployed to cloud for production
2. **Base64 Encoding**: Images sent as base64 strings for simplicity over multipart uploads
3. **Dual ML Models**: Separate models for quality assessment and condition classification
4. **OpenCV Fallback**: Additional quality metrics as backup validation
5. **JPG Only**: Simplified image handling with single format support
6. **Prediction Logging**: All predictions saved for future model improvement
7. **Accessibility**: 48dp touch targets, 16dp fonts, 4.5:1 contrast ratios

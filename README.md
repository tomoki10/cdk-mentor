# cdk-mentor

This library acts as a mentor to AWS CDK users, providing guidance and suggestions for better infrastructure coding practices. Inspired by [cfn_nag](https://github.com/stelligent/cfn_nag).

![Stability: Experimental](https://img.shields.io/badge/stability-Experimental-important.svg?style=for-the-badge)

## Overview Image

This library uses Aspects and is executed during the prepare phase.

```mermaid
graph LR
  A[CDK App<br>Source Code] --> B[Construction Phase]
  subgraph CDK App
    B --> C[Prepare Phase]
    C --> D[Validate Phase]
    D --> E[Synthesize Phase]
  end

  %% Styling
  classDef emphasis fill:#f88,stroke:#f33,stroke-width:4px;
  class C emphasis
  
  %% Annotations
  style C fill:#f88,stroke:#f33,stroke-width:4px

```

## Introduction

```
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
stack = new Stack(app);
cdk.Aspects.of(app).add(new CdkMentor());

new sns.Topic(stack, 'testStack');
```

```
% npx cdk synth
```

## Available Rules

- Recommends PascalCase for Construct IDs
- Avoid `Stack` or `Construct` in Construct IDs
- Detecte strong cross-stack references

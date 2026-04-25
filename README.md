# Welcome to my System Design repo

## Student's ID: 24B031944

![Header](https://github.com/aablty/aablty/blob/main/assets/webdev_banner.jpg)

## Contents

- [Checkout Saga](#checkout-saga)
- [Global Student Portal](#global-student-portal)
- [Search Engine](#search-engine)
- [Raft Consensus Algorithm](#raft-consensus-algorithm)
- [Humanitarian Aid Distribution System](#humanitarian-aid-distribution-system)

### Checkout Saga

- #### Task: Implement a Saga Pattern within a single microservice

  Create an e-commerce “checkout” workflow with Payment, Inventory, and Shipping steps.

  Each step must support "do" and "compensate" actions. If any step fails, previously completed steps must be compensated in reverse.

  Prepare brief README explaining your design and share links to your code (public github or gitlab repository)

### Global Student Portal

- #### Task: Design a Global Student Portal (multi-university)

  Design a worldwide student portal platform similar to wsp.kbtu.kz, but accessible to multiple institutions with multi-tenant architecture, secure isolation, integrations, and scalable operations.

### Search Engine

- #### Task: Design a large-scale search engine for web, internal knowledge bases, and partner data

  Design a search platform that can ingest continuously changing content, rank relevant results in milliseconds, and support freshness, typo tolerance, filtering, personalization, and content-owner controls at billion-document scale.

### Raft Consensus Algorithm

- #### Task: Implement a simplified version of the Raft consensus algorithm in a single programming language (e.g., Python, Java, Go)

  Create a cluster of 5 nodes that maintain a replicated log of updates to a shared JSON object. The system should support leader election, log replication, and fault tolerance. Provide endpoints for clients to read the current state and submit updates. Include documentation on how to run the cluster and test its functionality.

### Humanitarian Aid Distribution System

- #### Task: Design a Humanitarian Aid Distribution System for Disaster Response

  Design a system to coordinate the distribution of aid (food, water, medical supplies) during disasters. The system should handle inventory management, demand forecasting, logistics optimization, and real-time tracking of aid deliveries to affected areas. Consider scalability, reliability, and ease of use for both aid organizations and recipients.

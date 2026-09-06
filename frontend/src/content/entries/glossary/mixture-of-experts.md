---
term: Mixture of experts (MoE)
category: model-architecture
---
A model architecture where only a subset of the model's total parameters ('experts') activate for any given input, instead of the whole network running every time. Lets a model have a very large total parameter count while keeping the compute cost per request closer to a much smaller model.

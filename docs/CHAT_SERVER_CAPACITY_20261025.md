# Customer-care AI capacity — 25 October 2026

## Subsequent owner upgrade

At 2026-10-25T03:12Z the restarted server reported 20,001 MiB RAM, 8 CPUs and 4,096 MiB swap available to WSL. This supersedes the earlier 12 GB / 4 CPU runtime ceiling below; the earlier benchmark remains a measurement on the previous allocation, not a benchmark of the upgraded machine. No GPU upgrade was established. d3 BF16 remains beyond this memory budget.

## Observed server

Windows host: 23.4 GiB physical RAM, 12 logical processors, AMD Radeon integrated graphics. The running WSL environment exposes 11,962 MiB RAM, 4 CPUs and 2,048 MiB swap. No CUDA-capable NVIDIA GPU was observed. Windows capacity is not the capacity currently available to containers.

At the bounded check, WSL used approximately 4.5 GiB with 7.2 GiB available including reclaimable cache. Container memory limits are ceilings, not reserved capacity: production news AI allows 6 GiB, existing customer AI 2 GiB and staging AI 2 GiB. Simultaneous model loading can exceed available memory. Do not interpret idle memory as a safe permanent budget for another large model.

## Actual inference test

Existing production Ollama 0.11.4, `qwen2.5:1.5b`, model download approximately 986 MB. Synthetic Vietnamese request to rent a camera; structured classification only, no customer records, no booking or messages sent. Two sequential requests used a 1,024-token context, two inference threads, at most 60 output tokens, temperature zero and immediate unload (`keep_alive: 0`).

| Sample | Wall time | Model load | Output | Correct intent |
| --- | --- | --- | --- | --- |
| 1 | 5.379 s | 3.433 s | 10 tokens | rent |
| 2 | 4.135 s | 2.152 s | 10 tokens | rent |

Evidence: ignored `output/uat/chat-model-benchmark.json`, collected 2026-10-25T02:56:14Z. This is a two-request feasibility check, not a load test, Vietnamese answer-quality evaluation or proof of acceptable production concurrency. No swap was used in the reported samples. Existing website/services were not stopped or reconfigured for this check.

## Deployment decision

- Existing small local Qwen is feasible for bounded classification. Use canonical server answers for known policies, availability and prices; do not call a model for every deterministic answer.
- A newer 2B or 4B quantized Qwen is a candidate, not installed or verified by this test. Check compatible Ollama version, actual memory, concurrent news workloads and response quality before selecting it. Serialize optional inference and limit context; fail back to verified information/staff when unavailable.
- d3 is a 26.09B decision classifier, not a customer-facing text generator. BF16 weights alone exceed 50 GB. It cannot be enabled on the current WSL configuration. Even a potential quantized variant is not established as supported or usable here. Do not execute unreviewed remote model code or download large weights to claim integration.
- Hindsight needs its own database, embedding and inference budget. Its local deployment remains unverified; no readiness claim follows from cloning its source. Prefer a private service, public-knowledge memory first, and explicit isolation/expiry for any conversation memory.
- Do not enlarge WSL or restart Windows as part of this check: doing so can interrupt production. Dedicated inference hardware or an explicitly configured external endpoint is needed for d3; optional paid providers must remain disabled without operator configuration.

Primary model sources checked: [d3 model card](https://huggingface.co/vllm-sr/d3), [Qwen 3.5 Ollama library](https://ollama.com/library/qwen3.5), [Hindsight source](https://github.com/vectorize-io/hindsight). Retrieved artifacts are retained under ignored `output/research/chat-production-20261025/`. These are model/software facts, not a legal compliance determination.

import { promptHandler } from './_scripts/promptHandler'
import { UIHelper } from './_scripts/UIHelper'

action({
    author: 'noellealarie',
    name: 'Hires Fix Non-Latent',
    description: 'Ported from https://comfyanonymous.github.io/ComfyUI_examples/2_pass_txt2img/',
    help: '',
    ui: (form) => {
        const x = new UIHelper(form)
        return {
            prompt: form.group({
                label: 'Prompt',
                items: () => ({
                    ...x.prompts(),
                }),
            }),
            checkpoint: form.group({
                label: 'Checkpoint',
                items: () => ({
                    ...x.checkpoint(),
                }),
            }),
            ksampler: form.group({
                label: 'KSampler',
                items: () => ({
                    ...x.kSampler(),
                }),
            }),
            resolution: x.resolutionPicker(),
            txt2img: form.group({
                label: 'TXT2IMG',
                items: () => ({
                    seed: form.seed({ label: 'Seed', defaultMode: 'randomize' }),
                }),
            }),

            hiresfix: form.group({
                label: 'Hires Fix',
                items: () => ({
                    upscale_model: form.enum({ label: 'Upscale Model', enumName: 'Enum_UpscaleModelLoader_model_name' }),
                    upscale_factor: form.float({ label: 'Scale Factor', default: 1, theme: 'input' }),
                    ...x.kSampler(),
                    seed: form.seed({ label: 'Seed', defaultMode: 'randomize' }),
                }),
            }),
        }
    },
    run: async (flow, p) => {
        const graph = flow.nodes
        const checkpoint = { ...p.checkpoint }
        const ksampler = { ...p.ksampler }
        const width = Number(p.resolution.type.split('x')[0])
        const height = Number(p.resolution.type.split('x')[1])

        const hiresfix = { ...p.hiresfix }

        const ckpt = graph.CheckpointLoaderSimple({ ckpt_name: checkpoint.ckpt_name })

        // TXT2IMG
        const txt2img = {
            ...p.txt2img,
        }

        let clip_model: HasSingle_CLIP & HasSingle_MODEL = ckpt

        // CLIP
        let clip: _CLIP = clip_model._CLIP
        let model: _MODEL = clip_model._MODEL

        if (p.checkpoint.clip_skip) {
            clip = graph.CLIPSetLastLayer({ clip, stop_at_clip_layer: -Math.abs(p.checkpoint.clip_skip) })
        }

        // VAE
        let vae: _VAE = ckpt._VAE
        if (p.checkpoint.vae) vae = graph.VAELoader({ vae_name: p.checkpoint.vae })

        // PROMPT
        const positive_text = promptHandler(flow, graph, clip_model, p.prompt.positive)
        const negative_text = promptHandler(flow, graph, clip_model, p.prompt.negative, false)

        // CLIPS
        const positive = graph.CLIPTextEncode({ clip: flow.AUTO, text: positive_text })
        const negative = graph.CLIPTextEncode({ clip: flow.AUTO, text: negative_text })

        // LATENT

        let LATENT = graph.KSampler({
            seed: txt2img.seed,
            latent_image: graph.EmptyLatentImage({
                batch_size: 1,
                height: height,
                width: width,
            }),
            model,
            positive: positive,
            negative: negative,
            sampler_name: ksampler.sampler,
            scheduler: ksampler.scheduler,
            denoise: ksampler.denoise,
            steps: ksampler.steps,
            cfg: ksampler.cfg,
        })

        // HIRES FIX

        graph.PreviewImage({
            images: graph.VAEDecode({
                samples: LATENT,
                vae: vae,
            }),
        })

        const UPSCALED_IMAGE = graph.ImageUpscaleWithModel({
            image: graph.VAEDecode({
                samples: LATENT,
                vae: vae,
            }),
            upscale_model: graph.UpscaleModelLoader({
                model_name: hiresfix.upscale_model,
            }),
        })

        const final_w = width * hiresfix.upscale_factor
        const final_h = height * hiresfix.upscale_factor
        const DOWNSCALED_IMAGE = graph.ImageScale({
            image: UPSCALED_IMAGE,
            crop: 'disabled',
            upscale_method: 'nearest-exact',
            height: final_h,
            width: final_w,
        })

        flow.print(`target dimension: W=${final_w} x H=${final_h}`)
        const FINAL_LATENT = graph.KSampler({
            model,
            positive: positive,
            negative: negative,
            latent_image: graph.VAEEncode({
                pixels: DOWNSCALED_IMAGE,
                vae: vae,
            }),
            sampler_name: hiresfix.sampler,
            scheduler: hiresfix.scheduler,
            steps: hiresfix.steps,
            denoise: hiresfix.denoise,
        })

        // DECODE --------------------------------------------------------------------------------
        graph.PreviewImage({
            images: graph.VAEDecode({
                samples: FINAL_LATENT,
                vae: vae, // flow.AUTO,
            }),
        })

        // PROMPT
        await flow.PROMPT()
    },
})

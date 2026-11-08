import type {ReloopEmotion, ReloopAction} from './registry';

export const RELOOP_MASTER = '/mascot/reloop/approved-v2/master.webp';
export const EMOTION_ARTWORK: Record<ReloopEmotion,string> = {
  idle:'idle', listening:'idle', calm:'idle', happy:'happy', excited:'excited', proud:'proud', confident:'confident', grateful:'grateful', love:'love', celebrate:'celebrate', relieved:'grateful',
  thinking:'thinking', curious:'thinking', focused:'thinking', analyzing:'analyzing', scanning:'analyzing', learning:'thinking',
  greeting:'idle', explaining:'idle', teaching:'idle', encouraging:'happy', guiding:'confident',
  loading:'thinking', processing:'analyzing', verifying:'analyzing', syncing:'analyzing', uploading:'idle', downloading:'idle',
  success:'celebrate', verified:'confident', completed:'celebrate', achievement:'celebrate',
  concerned:'concerned', confused:'surprised', uncertain:'concerned', warning:'concerned', sad:'sad', disappointed:'sad', error:'concerned', frustrated:'frustrated', sleeping:'sleeping', resting:'action-sleep',
};
export const ACTION_ARTWORK: Partial<Record<ReloopAction,string>> = {
  wave:'action-wave', greet:'action-greet', run:'action-run', float:'action-float', think:'action-think', scan_asset:'action-analyze', verify_blockchain:'action-verify', calculate_trust_score:'action-trust', plant_tree:'action-plant', protect_asset:'action-protect', upload:'action-upload', recycle:'action-recycle', guide:'action-guide', sleep:'action-sleep', success_reveal:'action-success', celebrate:'action-success',
};
export function reloopArtwork(emotion:ReloopEmotion,action:ReloopAction,size:number) {
  // The reference sheet's small sprites are suitable for compact UI only.
  if(size>160 && emotion==='idle' && action==='idle_breathing')return RELOOP_MASTER;
  const pose = ACTION_ARTWORK[action];
  return `/mascot/reloop/approved-v3/${pose || EMOTION_ARTWORK[emotion] || 'idle'}.webp`;
}

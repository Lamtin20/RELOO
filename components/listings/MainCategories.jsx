"use client";
import styles from './MainCategories.module.css';
import {useLocale} from '@/components/settings/LocaleProvider';
import {catalogUiCopy} from '@/lib/i18n/catalog-ui';

import {IntentLink as Link} from '@/components/mobile/IntentLink';
import {BedDouble,Camera,Monitor,Armchair,Tent,Shirt,Baby,Car,Bike,Wrench,BriefcaseBusiness,Music,Flower2,PartyPopper,Package} from 'lucide-react';
import { getSpecGroupId } from "@/lib/category-specs";
import {
  CATEGORY_GROUP_ORDER,
} from "@/lib/category-artwork";
const categoryIcons={camera:Camera,electronics:Monitor,home:Armchair,camping:Tent,fashion:Shirt,baby:Baby,vehicle:Car,sports:Bike,tools:Wrench,office:BriefcaseBusiness,music:Music,beauty:Flower2,event:PartyPopper};
export function MainCategories({ categories = [] }) {
  const {locale}=useLocale(),t=catalogUiCopy[locale]||catalogUiCopy['vi-VN'];
  const groups = [
    ...new Set(categories.map((cat) => getSpecGroupId(cat.id))),
  ].sort(
    (a, b) => CATEGORY_GROUP_ORDER.indexOf(a) - CATEGORY_GROUP_ORDER.indexOf(b),
  );
  return (
    <nav className={"main-categories "+styles.nav} aria-label={t.categories}>
      <Link className={styles.item} href="/dat-phong">
        <span className={styles.icon}><BedDouble size={35} aria-hidden="true"/></span>
        <strong>{locale==='en-US'?'Stays':'Đặt phòng'}</strong>
      </Link>
      {groups.map((group) => {const CategoryIcon=categoryIcons[group]||Package;return (
        <Link className={styles.item} key={group} href={"/explore?group=" + group}>
          <span className={styles.icon}>
            <CategoryIcon size={29} strokeWidth={1.5} aria-hidden="true"/>
          </span>
          <strong>{t.groups[group]||t.groups.default}</strong>
        </Link>
      )})}
    </nav>
  );
}

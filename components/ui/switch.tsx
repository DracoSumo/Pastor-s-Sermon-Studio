
'use client'
import * as React from 'react'
export function Switch({ checked=false, onCheckedChange, id }:{ checked?: boolean; onCheckedChange?: (v:boolean)=>void; id?:string }) {
  return (
    <button id={id} onClick={()=>onCheckedChange?.(!checked)} className='switch' aria-pressed={checked}>
      <span className='switch-knob' style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
    </button>
  )
}

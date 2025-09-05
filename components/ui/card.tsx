
import * as React from 'react'
export function Card({className='', ...props}: React.HTMLAttributes<HTMLDivElement>) { return <div className={`card ${className}`} {...props} /> }
export function CardHeader({className='', ...props}: React.HTMLAttributes<HTMLDivElement>) { return <div className={`card-header ${className}`} {...props} /> }
export function CardTitle({className='', ...props}: React.HTMLAttributes<HTMLHeadingElement>) { return <h3 className={`card-title ${className}`} {...props} /> }
export function CardContent({className='', ...props}: React.HTMLAttributes<HTMLDivElement>) { return <div className={`card-content ${className}`} {...props} /> }

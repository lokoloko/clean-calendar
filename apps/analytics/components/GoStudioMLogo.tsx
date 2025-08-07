import Image from 'next/image'

export function GoStudioMLogo({ 
  width = 400, 
  height = 120,
  className = "" 
}: { 
  width?: number
  height?: number
  className?: string 
}) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/gostudiom-logo.png"
        alt="GoStudioM - Built for hosts, by a host"
        width={width}
        height={height}
        priority
        style={{ 
          width: 'auto',
          maxWidth: '100%', 
          height: 'auto',
          objectFit: 'contain'
        }}
      />
    </div>
  )
}
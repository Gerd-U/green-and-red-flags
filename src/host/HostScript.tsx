import type { HostInfo } from '../lib/types'

// Teleprompter for the host (filled in the next step).
export default function HostScript({ info }: { info: HostInfo }) {
  return <div className="host-script">{info.state.phase}</div>
}

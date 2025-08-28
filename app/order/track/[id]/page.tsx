import OrderTrackingClientPage from "./OrderTrackingClientPage"

// Add the required generateStaticParams function
export function generateStaticParams() {
  return []
}

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  return <OrderTrackingClientPage params={params} />
}

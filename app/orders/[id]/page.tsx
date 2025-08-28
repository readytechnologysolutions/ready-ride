import OrderDetailsClientPage from "./OrderDetailsClientPage"

// Add the required generateStaticParams function
export function generateStaticParams() {
  return []
}

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  return <OrderDetailsClientPage params={params} />
}

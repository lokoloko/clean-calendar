export type Listing = {
  id: string;
  name: string;
  icsUrl: string;
  assignedCleaners: string[];
};

export type Cleaner = {
  id: string;
  name: string;
  phone: string;
  email: string;
  listingsAssigned: number;
};

export type Assignment = {
  id: string;
  listingName: string;
  cleanerName: string;
};

export type ScheduleItem = {
  id: string;
  date: string;
  property: string;
  checkoutTime: string;
  notes: string;
};

export type OptimizedAssignment = {
  listingName: string;
  cleanerName: string;
  startTime: string;
  travelTime: string;
};

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { StayEntitlementsApiService } from '../../core/api/stay-entitlements-api.service';
import { StayManagementApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { StayManagementListComponent } from './stay-management-list.component';
import { StayFormComponent } from './stay-form.component';

describe('Stay allowance dashboard and publication', () => {
  const usage: any = {current_plan:{display_name:'Configured Host Plan'},active_stay_count:1,listing_limit:2,remaining_publication_capacity:1,can_publish_stay:true,usage_percent:50,activated_addons:[],capacity_reviews:[],protected_booking_over_limit:false};
  const stay: any = {id:'stay',name:'Saved Guesthouse',description:'Guesthouse',stay_type:'GUEST_HOUSE',region:'Hhohho',town:'Mbabane',amenities:[],images:[{id:'photo',image:'/photo.jpg',sort_order:0}],room_types:[{id:'room',name:'Room',base_price:'500',quantity:3,is_active:true,total_capacity:2,images:[]}],status:'DRAFT'};
  let entitlements: any; let api: any; let navigate: any;
  beforeEach(() => {
    entitlements={summary:vi.fn(()=>of(usage))};
    api={mine:vi.fn(()=>of({results:[stay]})),detail:vi.fn(()=>of(stay)),update:vi.fn(()=>of({id:'stay'})),submit:vi.fn(()=>of({...stay,status:'SUBMITTED'})),pause:vi.fn(()=>of({...stay,status:'PAUSED'}))};
    TestBed.configureTestingModule({imports:[StayManagementListComponent,StayFormComponent],providers:[provideRouter([]),
      {provide:ActivatedRoute,useValue:{snapshot:{queryParamMap:convertToParamMap({agency:'team'}),paramMap:convertToParamMap({id:'stay'})}}},
      {provide:StayEntitlementsApiService,useValue:entitlements},{provide:StayManagementApiService,useValue:api},
      {provide:ReferenceApiService,useValue:{data:signal({regions:[],stay_types:[],stay_amenities:[]})}}]});
    navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  });
  it('uses backend counts, plan name, progress and team scope', () => {
    const f=TestBed.createComponent(StayManagementListComponent);f.detectChanges();
    expect(entitlements.summary).toHaveBeenCalledWith('team');
    expect(f.nativeElement.textContent).toContain('Configured Host Plan');
    expect(f.nativeElement.textContent).toContain('1 of 2 active stays');
    expect(f.nativeElement.querySelector('progress').value).toBe(50);
  });
  it('shows protected booking obligations and refreshes after pause', () => {
    entitlements.summary.mockReturnValue(of({...usage,protected_booking_over_limit:true,legacy_over_limit:true}));
    const f=TestBed.createComponent(StayManagementListComponent);f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Existing reservations are protected');
    vi.spyOn(window,'confirm').mockReturnValue(true);
    f.componentInstance.pause({...stay,status:'PUBLISHED'});
    expect(entitlements.summary).toHaveBeenCalledTimes(2);
  });
  it('saves draft content before capacity preflight and preserves images and rooms when full', () => {
    entitlements.summary.mockReturnValue(of({...usage,can_publish_stay:false,remaining_publication_capacity:0}));
    const c=TestBed.createComponent(StayFormComponent).componentInstance;
    c.form.controls.confirmed.setValue(true,{emitEvent:false});
    c.form.controls.name.setValue('My edited guesthouse',{emitEvent:false});
    c.step.set(8); const original=c.form.getRawValue();c.submit();
    expect(api.update).toHaveBeenCalledWith('stay',expect.objectContaining({name:'My edited guesthouse'}));
    expect(api.submit).not.toHaveBeenCalled();expect(c.capacityFull()).toBe(true);expect(c.submitting()).toBe(false);
    expect(c.form.getRawValue()).toEqual(original);expect(c.stay()?.images).toEqual(stay.images);expect(c.roomTypes()).toEqual(stay.room_types);
    expect(c.step()).toBe(8);expect(c.error()).toContain('Your draft is saved');expect(navigate).not.toHaveBeenCalled();
  });
  it('uses a granted allowance permitted by scoped backend preflight', () => {
    entitlements.summary.mockReturnValue(of({...usage,remaining_publication_capacity:0,can_publish_stay:true}));
    const c=TestBed.createComponent(StayFormComponent).componentInstance;c.form.controls.confirmed.setValue(true,{emitEvent:false});c.submit();
    expect(entitlements.summary).toHaveBeenCalledWith('', 'stay');expect(api.submit).toHaveBeenCalledWith('stay');
    expect(navigate).toHaveBeenCalledWith(['/account/manage/stays','stay','submitted']);
  });
  it('handles a server capacity conflict without losing the draft or changing steps', () => {
    api.submit.mockReturnValue(throwError(()=>new HttpErrorResponse({status:400,error:{code:'STAY_LISTING_LIMIT_REACHED',message:'Stay capacity changed. Your draft is saved.',errors:{listing_limit:2}}})));
    const c=TestBed.createComponent(StayFormComponent).componentInstance;c.form.controls.confirmed.setValue(true,{emitEvent:false});c.step.set(8);c.submit();
    expect(c.capacityFull()).toBe(true);expect(c.error()).toContain('Stay capacity changed');expect(c.step()).toBe(8);expect(navigate).not.toHaveBeenCalled();
  });
  it('allows published editing without a submission or capacity check', () => {
    api.detail.mockReturnValue(of({...stay,status:'PUBLISHED'}));
    const c=TestBed.createComponent(StayFormComponent).componentInstance;c.form.controls.confirmed.setValue(true,{emitEvent:false});c.submit();
    expect(api.update).toHaveBeenCalled();expect(api.submit).not.toHaveBeenCalled();expect(entitlements.summary).not.toHaveBeenCalled();
    expect(c.saveState()).toBe('saved');expect(navigate).not.toHaveBeenCalled();
  });
  it('keeps paused stays editable for renewal and resubmission', () => {
    api.detail.mockReturnValue(of({...stay,status:'PAUSED'}));
    const c=TestBed.createComponent(StayFormComponent).componentInstance;
    expect(c.stay()?.status).toBe('PAUSED');expect(navigate).not.toHaveBeenCalled();
  });
});

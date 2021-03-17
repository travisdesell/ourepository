  
<?php
use Doctrine\ORM\Mapping as ORM;
/**
 * @ORM\Entity 
 * @ORM\Table(name="member_roles")
 */
class MemberRole
{
    /** @ORM\Id 
    * @ORM\Column(type="integer") 
     * @ORM\GeneratedValue */

    protected $id;

    /**
     * Many features have one product. This is the owning side.
     * @ORM\ManyToOne(targetEntity="User")
     */
    protected $member;


    /**
     * Many features have one product. This is the owning side.
     * @ORM\ManyToOne(targetEntity="Organization")
     */
    protected $organization;


    /** @ORM\OneToOne(targetEntity="Role") */
    protected $role;



    public function getId()
    {
        return $this->id;
    }

    public function getName()
    {
        return $this->name;
    }
    
    public function setName($name)
    {
        $this->name = $name;
    }

    public function setMember($member)
    {
        $this->member = $member;
    }

    public function setOrganization($organization)
    {
        $this->organization = $organization;
    }

    public function setRole($role)
    {
        $this->role = $role;
    } 
}

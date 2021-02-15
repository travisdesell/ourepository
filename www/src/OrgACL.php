  
<?php
use Doctrine\ORM\Mapping as ORM;
/**
 * @ORM\Entity 
 * @ORM\Table(name="org_acl")
 */
class OrgACL
{
    /** @ORM\Id 
     * @ORM\Column(type="integer") 
     * @ORM\GeneratedValue */
    protected $id;

    /** @ORM\Column(type="string") */
    protected $organization;

    /** @ORM\Column(type="boolean") */
    protected $role;

    /** @ORM\Column(type="string") */
    protected $permission;


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
}

// Pseudocode
// shareMosaic(){
// 	checkUser(user){
// 		roles->user.roles	
// 		roles->getRoles(organization)
// 		roles.contain(permission)
// 	}
// }